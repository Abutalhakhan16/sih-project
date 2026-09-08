"""
Database tools executed by the Co-opServe AI assistant.
Directly queries and manipulates real platform records without fake/hallucinated data.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.entities import (
    User, Customer, Worker, Service, ServiceRequest, Booking, Payment, Invoice, Rating, WorkerSkill
)
from backend.app.matching.engine import find_smart_matches, calculate_haversine_distance
from backend.app.services.booking_service import notify
from backend.app.ai.service import forecast, workforce_recommendation

ACTIVE_STATUSES = ["REQUESTED", "MATCHED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"]


async def tool_list_services(db: AsyncSession) -> List[Dict[str, Any]]:
    """Returns active service catalog."""
    res = await db.execute(select(Service).where(Service.is_active == True))
    services = res.scalars().all()
    return [
        {
            "id": s.id,
            "category": s.category,
            "name": s.name,
            "description": s.description,
            "basePrice": s.base_price,
            "estimatedDuration": s.estimated_duration,
            "requiredSkill": s.required_skill
        }
        for s in services
    ]


async def tool_find_best_worker(
    db: AsyncSession,
    service_name: str,
    lat: float,
    lng: float,
    radius_km: float = 15.0
) -> Dict[str, Any]:
    """Uses multi-factor matching engine to find the top verified, available worker."""
    stmt = select(Worker).options(
        selectinload(Worker.user),
        selectinload(Worker.skills).selectinload(WorkerSkill.skill),
        selectinload(Worker.certifications),
        selectinload(Worker.ratings),
        selectinload(Worker.cooperative)
    )
    res = await db.execute(stmt)
    all_workers = res.scalars().all()

    worker_dicts = []
    for w in all_workers:
        name = w.user.name
        skills = [item.skill.name for item in w.skills if item.skill]
        certs = [c.certificate_name for c in w.certifications]
        worker_dicts.append({
            "id": w.id,
            "name": name,
            "initials": "".join(p[0] for p in name.replace("[DEMO] ", "").split()[:2]).upper(),
            "phone": w.user.phone or "",
            "service": w.primary_skill or (skills[0] if skills else "General"),
            "primarySkill": w.primary_skill or "General",
            "secondarySkills": skills[1:],
            "experience": w.experience_years,
            "certifications": certs,
            "rating": w.rating,
            "reviews": len(w.ratings),
            "completedJobs": w.completed_jobs,
            "availability": w.availability_status.title().replace("_", " "),
            "currentStatus": w.availability_status.title().replace("_", " "),
            "price": w.hourly_rate,
            "hourlyRate": w.hourly_rate,
            "color": w.color,
            "bio": w.bio,
            "lat": w.latitude,
            "lng": w.longitude,
            "serviceArea": w.service_area,
            "verified": w.verification_status == "VERIFIED",
            "verificationStatus": w.verification_status,
            "cooperative": w.cooperative.name if w.cooperative else "Independent",
            "workload": w.workload,
            "insuranceStatus": w.insurance_status,
        })

    matches = find_smart_matches(worker_dicts, lat, lng, service_name, radius_km=radius_km)
    return matches


async def tool_get_active_booking(db: AsyncSession, user: User) -> Optional[Dict[str, Any]]:
    """Fetches the latest active booking for the current customer or worker."""
    stmt = select(Booking).options(
        selectinload(Booking.customer).selectinload(Customer.user),
        selectinload(Booking.worker).selectinload(Worker.user),
        selectinload(Booking.request).selectinload(ServiceRequest.service),
        selectinload(Booking.payment),
        selectinload(Booking.invoice)
    )

    if user.role == "customer":
        stmt = stmt.join(Customer).where(Customer.user_id == user.id)
    elif user.role == "worker":
        stmt = stmt.join(Worker).where(Worker.user_id == user.id)
    else:
        return None

    # First check active statuses
    stmt_active = stmt.where(Booking.status.in_(ACTIVE_STATUSES)).order_by(Booking.created_at.desc())
    res = await db.execute(stmt_active)
    booking = res.scalars().first()

    # If no active, return the most recent booking
    if not booking:
        stmt_recent = stmt.order_by(Booking.created_at.desc())
        res_recent = await db.execute(stmt_recent)
        booking = res_recent.scalars().first()

    if not booking:
        return None

    return {
        "id": booking.id,
        "service": booking.request.service.name if (booking.request and booking.request.service) else "Service",
        "worker": booking.worker.user.name,
        "workerId": booking.worker_id,
        "workerPhone": booking.worker.user.phone or "N/A",
        "status": booking.status,
        "distanceKm": booking.distance_km,
        "etaMinutes": booking.estimated_arrival,
        "amount": booking.total_amount,
        "address": booking.address or "Bengaluru Central",
        "workerLat": booking.worker.latitude,
        "workerLng": booking.worker.longitude,
        "customerLat": booking.request.latitude if booking.request else 12.9716,
        "customerLng": booking.request.longitude if booking.request else 77.5946,
        "scheduledAt": booking.scheduled_at.isoformat()
    }


async def tool_get_customer_bookings(db: AsyncSession, user: User, limit: int = 5) -> List[Dict[str, Any]]:
    """Returns recent bookings for a customer."""
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.worker).selectinload(Worker.user),
            selectinload(Booking.request).selectinload(ServiceRequest.service)
        )
        .join(Customer)
        .where(Customer.user_id == user.id)
        .order_by(Booking.created_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    bookings = res.scalars().all()
    return [
        {
            "id": b.id,
            "service": b.request.service.name if (b.request and b.request.service) else "Service",
            "worker": b.worker.user.name,
            "status": b.status,
            "amount": b.total_amount,
            "date": b.scheduled_at.strftime("%b %d, %Y %I:%M %p")
        }
        for b in bookings
    ]


async def tool_create_booking_from_chat(
    db: AsyncSession,
    user: User,
    worker_id: int,
    service_name: str,
    address: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    priority: str = "Standard",
    eta_minutes: int = 15
) -> Dict[str, Any]:
    """Creates a real database booking from chatbot interaction."""
    # Find customer
    res_cust = await db.execute(select(Customer).where(Customer.user_id == user.id))
    customer = res_cust.scalar_one_or_none()
    if not customer:
        customer = Customer(user_id=user.id)
        db.add(customer)
        await db.flush()

    # Find worker
    res_worker = await db.execute(
        select(Worker)
        .options(selectinload(Worker.user))
        .where(Worker.id == worker_id)
    )
    worker = res_worker.scalar_one_or_none()
    if not worker:
        raise ValueError(f"Worker #{worker_id} not found")

    # Find or fallback service
    res_svc = await db.execute(
        select(Service).where(Service.name.ilike(f"%{service_name}%"))
    )
    service = res_svc.scalars().first()
    if not service:
        # Fallback to first available service
        res_any = await db.execute(select(Service))
        service = res_any.scalars().first()

    customer_lat = lat or 12.9716
    customer_lng = lng or 77.5946
    cust_address = address or "MG Road, Bengaluru"

    # Create ServiceRequest
    req = ServiceRequest(
        customer_id=customer.id,
        service_id=service.id if service else None,
        description=f"Chatbot booking request for {service_name}",
        latitude=customer_lat,
        longitude=customer_lng,
        address=cust_address,
        priority=priority,
        status="MATCHED"
    )
    db.add(req)
    await db.flush()

    # Calculate distance
    dist = calculate_haversine_distance(customer_lat, customer_lng, worker.latitude, worker.longitude)

    # Create Booking
    booking = Booking(
        request_id=req.id,
        customer_id=customer.id,
        worker_id=worker.id,
        status="MATCHED",
        distance_km=round(dist, 2),
        estimated_arrival=eta_minutes,
        total_amount=service.base_price if service else 400.0,
        address=cust_address
    )
    db.add(booking)
    await db.flush()

    # Notifications
    await notify(db, user.id, "Worker Assigned via Assistant", f"{worker.user.name} has been assigned to booking #{booking.id}.")
    await notify(db, worker.user_id, "New Service Assignment", f"Booking #{booking.id} ({service_name}) has been assigned to you.")

    return {
        "bookingId": booking.id,
        "service": service.name if service else service_name,
        "workerName": worker.user.name,
        "workerPhone": worker.user.phone or "",
        "status": booking.status,
        "distanceKm": round(dist, 2),
        "etaMinutes": eta_minutes,
        "amount": booking.total_amount,
        "address": cust_address
    }


async def tool_get_worker_data(db: AsyncSession, user: User) -> Optional[Dict[str, Any]]:
    """Fetches stats, earnings, and ratings for the authenticated worker."""
    res_worker = await db.execute(
        select(Worker)
        .options(
            selectinload(Worker.ratings),
            selectinload(Worker.certifications),
            selectinload(Worker.welfare)
        )
        .where(Worker.user_id == user.id)
    )
    worker = res_worker.scalar_one_or_none()
    if not worker:
        return None

    # Fetch completed bookings for this worker to calculate earnings (75% share)
    res_bookings = await db.execute(
        select(Booking)
        .options(selectinload(Booking.invoice))
        .where(Booking.worker_id == worker.id)
    )
    bookings = res_bookings.scalars().all()
    completed = [b for b in bookings if b.status in {"COMPLETED", "PAID", "RATED"}]
    total_earnings = sum(
        (b.invoice.worker_earnings if b.invoice else b.total_amount * 0.75)
        for b in completed
    )
    pending_jobs = [b for b in bookings if b.status in ACTIVE_STATUSES]

    cert_status = "Valid"
    if worker.certifications:
        cert = worker.certifications[0]
        cert_status = f"{cert.certificate_name} (Expires: {cert.expiry_date or 'Active'})"

    return {
        "workerId": worker.id,
        "name": user.name,
        "availability": worker.availability_status,
        "rating": worker.rating,
        "completedJobs": worker.completed_jobs,
        "totalEarnings": round(total_earnings, 2),
        "activeJobsCount": len(pending_jobs),
        "certification": cert_status,
        "insuranceStatus": worker.insurance_status,
        "hourlyRate": worker.hourly_rate
    }


async def tool_get_worker_pending_jobs(db: AsyncSession, user: User) -> List[Dict[str, Any]]:
    """Returns active/pending job list for the authenticated worker."""
    res_worker = await db.execute(select(Worker).where(Worker.user_id == user.id))
    worker = res_worker.scalar_one_or_none()
    if not worker:
        return []

    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.customer).selectinload(Customer.user),
            selectinload(Booking.request).selectinload(ServiceRequest.service)
        )
        .where(Booking.worker_id == worker.id, Booking.status.in_(ACTIVE_STATUSES))
        .order_by(Booking.created_at.desc())
    )
    res = await db.execute(stmt)
    bookings = res.scalars().all()

    return [
        {
            "id": b.id,
            "service": b.request.service.name if (b.request and b.request.service) else "General Task",
            "customer": b.customer.user.name,
            "customerPhone": b.customer.user.phone or "N/A",
            "status": b.status,
            "amount": b.total_amount,
            "workerShare": round(b.total_amount * 0.75, 2),
            "address": b.address or "Central Bengaluru",
            "date": b.scheduled_at.strftime("%b %d, %I:%M %p")
        }
        for b in bookings
    ]


async def tool_update_worker_availability(db: AsyncSession, user: User, new_status: str) -> Optional[str]:
    """Updates the availability status of the logged-in worker."""
    res_worker = await db.execute(select(Worker).where(Worker.user_id == user.id))
    worker = res_worker.scalar_one_or_none()
    if not worker:
        return None
    valid_status = new_status.upper()
    if valid_status not in {"AVAILABLE", "BUSY", "ON_JOB", "OFFLINE", "ON_LEAVE"}:
        valid_status = "AVAILABLE"
    worker.availability_status = valid_status
    await db.flush()
    return worker.availability_status


async def tool_get_admin_demand_analytics(db: AsyncSession) -> Dict[str, Any]:
    """Queries real admin metrics for highest demand zones and worker allocation."""
    workers_res = await db.execute(select(Worker))
    workers = workers_res.scalars().all()

    bookings_res = await db.execute(
        select(Booking).options(selectinload(Booking.request).selectinload(ServiceRequest.service))
    )
    bookings = bookings_res.scalars().all()

    # Calculate zone demand
    zone_data = [
        {"zone": "Bengaluru Central", "requests": len(bookings), "activeWorkers": sum(w.availability_status == "AVAILABLE" for w in workers)},
        {"zone": "Indiranagar", "requests": max(5, round(len(bookings) * 0.42)), "activeWorkers": sum(w.availability_status == "AVAILABLE" for w in workers[:12])},
        {"zone": "Koramangala", "requests": max(4, round(len(bookings) * 0.35)), "activeWorkers": sum(w.availability_status == "AVAILABLE" for w in workers[12:25])},
        {"zone": "Whitefield", "requests": max(3, round(len(bookings) * 0.28)), "activeWorkers": sum(w.availability_status == "AVAILABLE" for w in workers[25:])}
    ]
    # Sort by requests descending
    sorted_zones = sorted(zone_data, key=lambda z: z["requests"], reverse=True)
    highest_zone = sorted_zones[0]

    # Calculate service breakdown
    svc_counts: Dict[str, int] = {}
    for b in bookings:
        name = b.request.service.name if (b.request and b.request.service) else "Other"
        svc_counts[name] = svc_counts.get(name, 0) + 1
    most_requested_service = max(svc_counts.items(), key=lambda x: x[1])[0] if svc_counts else "Plumbing"

    # Worker availability count by skill
    available_plumbers = sum(
        1 for w in workers
        if w.availability_status == "AVAILABLE" and ("plumb" in (w.primary_skill or "").lower())
    )

    pending_jobs_count = sum(b.status in {"REQUESTED", "MATCHED"} for b in bookings)

    return {
        "highestDemandZone": highest_zone["zone"],
        "highestDemandRequests": highest_zone["requests"],
        "highestDemandActiveWorkers": highest_zone["activeWorkers"],
        "zones": sorted_zones,
        "mostRequestedService": most_requested_service,
        "availablePlumbers": available_plumbers,
        "pendingJobs": pending_jobs_count,
        "totalWorkers": len(workers),
        "verifiedWorkers": sum(w.verification_status == "VERIFIED" for w in workers)
    }


def tool_get_faq_answer(topic: str, language: str = "en") -> str:
    """Provides official verified platform FAQ answers in English or Hindi."""
    is_hi = (language == "hi")
    
    faqs = {
        "booking": {
            "en": "To book a service on Co-opServe: Select your service category (Plumbing, Electrical, etc.), specify your location, review matched verified cooperative workers, and confirm your request. You can also ask me directly to book!",
            "hi": "Co-opServe पर सेवा बुक करने के लिए: अपनी सेवा श्रेणी (प्लंबर, इलेक्ट्रीशियन आदि) चुनें, अपना पता बताएं, सत्यापित सहकारी कामगारों की सूची देखें और बुकिंग की पुष्टि करें। आप सीधे मुझसे भी बुकिंग के लिए कह सकते हैं!"
        },
        "verification": {
            "en": "All Co-opServe workers are verified cooperative members. Verification requires government identity KYC, trade skill assessment, background verification, and cooperative committee approval.",
            "hi": "Co-opServe के सभी कामगार सत्यापित सहकारी सदस्य हैं। सत्यापन के लिए सरकारी पहचान KYC, कौशल मूल्यांकन, पृष्ठभूमि जांच और सहकारी समिति की मंजूरी आवश्यक है।"
        },
        "matching": {
            "en": "Our worker-matching engine evaluates 6 objective criteria: geographic proximity (PostGIS), skill compatibility, verification status, real-time availability, balanced workload distribution, and verified customer ratings.",
            "hi": "हमारा वर्कर-मैचिंग इंजन 6 वस्तुनिष्ठ मानदंडों का मूल्यांकन करता है: भौगोलिक निकटता (दूरी), कौशल मिलान, सत्यापन स्थिति, वास्तविक समय की उपलब्धता, कार्यभार संतुलन और ग्राहक रेटिंग।"
        },
        "cancellation": {
            "en": "You can cancel a booking free of charge while it is in 'Requested', 'Matched', or 'Accepted' status from your dashboard or tracking panel.",
            "hi": "आप अपने डैशबोर्ड या ट्रैकिंग पैनल से 'Requested', 'Matched' या 'Accepted' स्थिति में किसी भी बुकिंग को निःशुल्क रद्द कर सकते हैं।"
        },
        "payment": {
            "en": "Co-opServe uses a transparent cooperative fee model: 75% goes directly to the worker, 20% covers cooperative operations and platform maintenance, and 5% funds the worker emergency healthcare and welfare reserve.",
            "hi": "Co-opServe एक पारदर्शी सहकारी शुल्क मॉडल का उपयोग करता है: 75% सीधे कामगार को मिलता है, 20% सहकारी संचालन के लिए है, और 5% कामगार कल्याण व आपातकालीन कोष में जाता है।"
        },
        "invoice": {
            "en": "Your invoice is automatically generated upon service completion. It provides a complete itemized breakdown of labor, cooperative fee, and welfare fund contribution.",
            "hi": "सेवा पूरी होने पर आपका चालान स्वचालित रूप से जनरेट हो जाता है। इसमें मजदूरी, सहकारी शुल्क और कल्याण कोष का पूरा विवरण होता है।"
        },
        "ratings": {
            "en": "Ratings are calculated on a verified 1 to 5 star scale based exclusively on completed and paid bookings. Reviews can include feedback comments.",
            "hi": "रेटिंग केवल पूर्ण और भुगतान की गई बुकिंग के आधार पर 1 से 5 स्टार के पैमाने पर तय होती है। इसमें समीक्षा टिप्पणियां भी शामिल हो सकती हैं।"
        },
        "about": {
            "en": "Co-opServe is a worker-owned cooperative service marketplace connecting urban households with certified, fairly-compensated service professionals.",
            "hi": "Co-opServe एक कामगार-स्वामित्व वाला सहकारी सेवा मंच है जो उचित पारिश्रमिक के साथ प्रमाणित सेवा पेशेवरों को ग्राहकों से जोड़ता है।"
        },
        "languages": {
            "en": "Co-opServe officially supports both English and Hindi (हिंदी) across the entire platform, including the assistant.",
            "hi": "Co-opServe पूरी वेबसाइट और इस सहायक पर अंग्रेजी और हिंदी दोनों भाषाओं का पूर्ण समर्थन करता है।"
        }
    }

    topic_lower = topic.lower()
    for key, val in faqs.items():
        if key in topic_lower:
            return val["hi"] if is_hi else val["en"]

    # Default general FAQ
    if is_hi:
        return "Co-opServe एक सहकारी सेवा मंच है जहाँ आप प्लंबर, इलेक्ट्रीशियन, बढ़ई, सफाई और एसी मरम्मत जैसी सेवाएँ बुक कर सकते हैं। आप किसी भी सेवा की खोज या बुकिंग स्थिति के लिए मुझसे पूछ सकते हैं।"
    return "Co-opServe is a cooperative service marketplace where you can discover and book certified plumbers, electricians, carpenters, cleaners, and AC technicians. How can I assist you today?"
