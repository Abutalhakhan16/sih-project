"""FastAPI entrypoint for the Co-opServe REST API."""
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, date
from typing import Optional
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.config import settings
from backend.app.database import Base, engine, async_session_factory
from backend.app.dependencies import get_db, get_current_user, get_optional_user, require_role
from backend.app.models.entities import (User, Customer, Worker, Service, ServiceRequest, Booking, Payment, Invoice, Rating, Notification, Skill, WorkerSkill, Cooperative, Welfare)
from backend.app.schemas.all_schemas import (RegisterRequest, LoginRequest, DemoLoginRequest, UserUpdate, WorkerAvailabilityUpdate, WorkerLocationUpdate, WorkerVerificationUpdate, ServiceCreate, ServiceRequestCreate, BookingCreate, BookingStatusUpdate, PaymentCreateRequest, PaymentVerifyRequest, RatingCreateRequest, ChatMessageRequest, ChatMessageOut, ChatHistoryOut)
from backend.app.services.auth_service import create_access_token, get_password_hash, verify_password
from backend.app.services.seed import seed_demo_data
from backend.app.services.booking_service import notify, transition_booking
from backend.app.matching.engine import find_smart_matches, calculate_haversine_distance
from backend.app.ai.service import forecast, workforce_recommendation
from backend.app.chat.manager import handle_user_message, get_session_history, clear_session_history

ACTIVE_BOOKING_STATES = {"REQUESTED", "MATCHED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    if settings.APP_ENV != "production":
        async with async_session_factory() as session:
            await seed_demo_data(session); await session.commit()
    yield
    await engine.dispose()

app = FastAPI(title="Co-opServe API", version="1.0.0", description="Cooperative service marketplace API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def user_out(user: User, worker: Optional[Worker] = None, customer: Optional[Customer] = None):
    data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone or "",
        "role": user.role,
        "language": user.language or "en",
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
    if worker:
        data["worker_id"] = worker.id
        data["verification_status"] = worker.verification_status
        data["availability_status"] = worker.availability_status
        data["primary_skill"] = worker.primary_skill
    if customer:
        data["customer_id"] = customer.id
    return data

async def enrich_user_out(user: User, db: AsyncSession):
    worker = None
    customer = None
    if user.role == "worker":
        worker = (await db.execute(select(Worker).where(Worker.user_id == user.id))).scalar_one_or_none()
    elif user.role == "customer":
        customer = (await db.execute(select(Customer).where(Customer.user_id == user.id))).scalar_one_or_none()
    return user_out(user, worker, customer)

def worker_out(worker: Worker, distance: Optional[float] = None):
    name = worker.user.name; skills = [item.skill.name for item in worker.skills if item.skill]
    certs = [item.certificate_name for item in worker.certifications]
    return {"id": worker.id, "name": name, "initials": "".join(p[0] for p in name.replace("[DEMO] ", "").split()[:2]).upper(), "phone": worker.user.phone or "", "service": worker.primary_skill or (skills[0] if skills else "General"), "primarySkill": worker.primary_skill or "General", "secondarySkills": skills[1:], "experience": worker.experience_years, "certifications": certs, "rating": worker.rating, "reviews": len(worker.ratings), "completedJobs": worker.completed_jobs, "availability": worker.availability_status.title().replace("_", " "), "currentStatus": worker.availability_status.title().replace("_", " "), "price": worker.hourly_rate, "hourlyRate": worker.hourly_rate, "color": worker.color, "bio": worker.bio, "lat": worker.latitude, "lng": worker.longitude, "serviceArea": worker.service_area, "verified": worker.verification_status == "VERIFIED", "verificationStatus": worker.verification_status, "cooperative": worker.cooperative.name if worker.cooperative else "Independent", "workload": worker.workload, "insuranceStatus": worker.insurance_status, "distance": distance}

async def get_worker(db: AsyncSession, worker_id: int) -> Worker:
    result = await db.execute(select(Worker).options(selectinload(Worker.user), selectinload(Worker.skills).selectinload(WorkerSkill.skill), selectinload(Worker.certifications), selectinload(Worker.ratings), selectinload(Worker.cooperative)).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if not worker: raise HTTPException(404, "Worker not found")
    return worker

async def get_booking(db: AsyncSession, booking_id: int) -> Booking:
    result = await db.execute(select(Booking).options(selectinload(Booking.customer).selectinload(Customer.user), selectinload(Booking.worker).selectinload(Worker.user), selectinload(Booking.request).selectinload(ServiceRequest.service), selectinload(Booking.payment), selectinload(Booking.invoice), selectinload(Booking.rating)).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking: raise HTTPException(404, "Booking not found")
    return booking

def booking_out(b: Booking):
    return {"id": b.id, "service": b.request.service.name if b.request and b.request.service else "Service", "serviceId": b.request.service_id if b.request else None, "worker": b.worker.user.name, "workerId": b.worker_id, "customerId": b.customer_id, "customerName": b.customer.user.name, "workerLat": b.worker.latitude, "workerLng": b.worker.longitude, "customerLat": b.request.latitude if b.request else None, "customerLng": b.request.longitude if b.request else None, "date": b.scheduled_at.isoformat(), "status": b.status, "amount": b.total_amount, "etaMinutes": b.estimated_arrival, "address": b.address, "invoiceNumber": b.invoice.invoice_number if b.invoice else None, "rating": b.rating.rating if b.rating else None, "review": b.rating.review if b.rating else None, "paymentMethod": b.payment.payment_method if b.payment else None, "invoice": {"id":b.invoice.id,"invoice_number":b.invoice.invoice_number,"subtotal":b.invoice.subtotal,"tax":b.invoice.tax,"total":b.invoice.total,"worker_earnings":b.invoice.worker_earnings,"coop_fee":b.invoice.coop_fee,"community_fund":b.invoice.community_fund,"issued_at":b.invoice.issued_at} if b.invoice else None}

@app.get("/health", tags=["System"])
async def health(): return {"status": "ok", "service": settings.APP_NAME}

@app.post("/api/auth/register", status_code=201, tags=["Authentication"])
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    role = payload.role.lower().strip()
    if role not in {"customer", "worker"}:
        raise HTTPException(status_code=422, detail="Only customer or worker self-registration is allowed")
    
    if len(payload.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters long")
    
    if payload.confirm_password and payload.confirm_password != payload.password:
        raise HTTPException(status_code=422, detail="Passwords do not match")
    
    # Check duplicate email
    if (await db.execute(select(User.id).where(User.email.ilike(payload.email.strip())))).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email is already registered")
    
    phone = payload.phone.strip() if payload.phone else None
    if phone:
        if (await db.execute(select(User.id).where(User.phone == phone))).scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Mobile number is already registered")

    user = User(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        phone=phone,
        password_hash=get_password_hash(payload.password),
        role=role,
        language=payload.language or "en"
    )
    db.add(user)
    await db.flush()

    if role == "customer":
        customer = Customer(user_id=user.id, preferred_language=payload.language or "en")
        db.add(customer)
        await db.flush()
        db.add(Notification(
            user_id=user.id,
            title="Welcome to Co-opServe",
            message=f"Welcome, {user.name}! Your customer account is ready.",
            type="system"
        ))
    else:  # worker
        coop_id = payload.cooperative_id
        if not coop_id and payload.cooperative:
            coop = (await db.execute(select(Cooperative).where(Cooperative.name.ilike(f"%{payload.cooperative}%")))).scalar_one_or_none()
            if coop:
                coop_id = coop.id
        if not coop_id:
            coop_id = (await db.execute(select(Cooperative.id).limit(1))).scalar_one_or_none()

        primary_skill = payload.service or (payload.skills[0] if payload.skills else "Plumber")
        worker = Worker(
            user_id=user.id,
            cooperative_id=coop_id,
            latitude=payload.latitude or 12.9716,
            longitude=payload.longitude or 77.5946,
            primary_skill=primary_skill,
            experience_years=payload.experience_years or 1,
            hourly_rate=payload.hourly_rate or 350.0,
            service_area=payload.service_area or "Bengaluru",
            verification_status="PENDING",
            availability_status="AVAILABLE",
            bio=f"Registered cooperative worker in {primary_skill}."
        )
        db.add(worker)
        await db.flush()

        skills_to_add = payload.skills or ([payload.service] if payload.service else [])
        for skill_name in skills_to_add:
            if not skill_name:
                continue
            skill_obj = (await db.execute(select(Skill).where(Skill.name.ilike(skill_name)))).scalar_one_or_none()
            if not skill_obj:
                skill_obj = Skill(name=skill_name, description=f"{skill_name} service")
                db.add(skill_obj)
                await db.flush()
            db.add(WorkerSkill(worker_id=worker.id, skill_id=skill_obj.id, proficiency="Intermediate", verified=False))

        db.add(Welfare(worker_id=worker.id, leave_balance=12))
        db.add(Notification(
            user_id=user.id,
            title="Registration Submitted",
            message="Your worker registration has been submitted and is pending verification by a Cooperative Admin.",
            type="welfare"
        ))

    await db.flush()
    token = create_access_token({"sub": str(user.id), "role": user.role})
    enriched = await enrich_user_out(user, db)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": enriched
    }

@app.post("/api/auth/login", tags=["Authentication"])
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        identifier = payload.get_identifier()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    clean_id = identifier.strip()
    if clean_id.lower() == "worker1@coopserve.demo":
        stmt = select(User).where(User.email.in_(["demo.worker@coopserve.test", "worker1@coopserve.demo"]))
    else:
        stmt = select(User).where((User.email.ilike(clean_id)) | (User.phone == clean_id))
    user = (await db.execute(stmt)).scalars().first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    enriched = await enrich_user_out(user, db)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": enriched
    }

@app.post("/api/auth/demo-login", tags=["Authentication"])
async def demo_login(payload: DemoLoginRequest, db: AsyncSession = Depends(get_db)):
    role = payload.role.lower().strip()
    if role not in {"customer", "worker", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid role for demo login. Must be 'customer', 'worker', or 'admin'.")

    canonical_map = {
        "customer": "demo.customer@coopserve.test",
        "worker": "demo.worker@coopserve.test",
        "admin": "demo.admin@coopserve.test"
    }
    user = (await db.execute(select(User).where(User.email == canonical_map[role]))).scalar_one_or_none()

    if not user:
        legacy_map = {
            "customer": "customer@coopserve.demo",
            "worker": "worker1@coopserve.demo",
            "admin": "admin@coopserve.demo"
        }
        user = (await db.execute(select(User).where(User.email == legacy_map[role]))).scalar_one_or_none()

    if not user:
        user = (await db.execute(select(User).where(User.role == role))).scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail=f"No demo user found for role '{role}'. Please seed demo data.")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    enriched = await enrich_user_out(user, db)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": enriched
    }

@app.post("/api/auth/logout", tags=["Authentication"])
async def logout(current: Optional[User] = Depends(get_optional_user)):
    return {"status": "success", "message": "Successfully logged out"}

@app.get("/api/auth/me", tags=["Authentication"])
@app.get("/api/users/me", tags=["Users"])
async def me(current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await enrich_user_out(current, db)

@app.get("/api/workers/me", tags=["Workers"])
async def worker_me(db: AsyncSession = Depends(get_db), current: User = Depends(require_role(["worker"]))):
    result = await db.execute(
        select(Worker)
        .options(
            selectinload(Worker.user),
            selectinload(Worker.skills).selectinload(WorkerSkill.skill),
            selectinload(Worker.certifications),
            selectinload(Worker.ratings),
            selectinload(Worker.cooperative)
        )
        .where(Worker.user_id == current.id)
    )
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(404, "Worker profile not found for authenticated user")
    return worker_out(worker)

@app.put("/api/users/me", tags=["Users"])
async def update_me(payload: UserUpdate, current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(current, key, value)
    await db.flush()
    return await enrich_user_out(current, db)

@app.get("/api/services", tags=["Services"])
async def list_services(db: AsyncSession = Depends(get_db)): return (await db.execute(select(Service).where(Service.is_active == True))).scalars().all()
@app.get("/api/services/{service_id}", tags=["Services"])
async def service_detail(service_id: int, db: AsyncSession = Depends(get_db)):
    row = await db.get(Service, service_id)
    if not row: raise HTTPException(404, "Service not found")
    return row
@app.post("/api/services", status_code=201, tags=["Services"])
async def create_service(payload: ServiceCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    row = Service(**payload.model_dump()); db.add(row); await db.flush(); return row
@app.put("/api/services/{service_id}", tags=["Services"])
async def update_service(service_id: int, payload: ServiceCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    row = await db.get(Service, service_id)
    if not row: raise HTTPException(404, "Service not found")
    for key, value in payload.model_dump().items(): setattr(row, key, value)
    return row

@app.get("/api/workers", tags=["Workers"])
async def list_workers(service: Optional[str] = None, availability: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Worker).options(selectinload(Worker.user),selectinload(Worker.skills).selectinload(WorkerSkill.skill),selectinload(Worker.certifications),selectinload(Worker.ratings),selectinload(Worker.cooperative))
    if service: stmt = stmt.where(Worker.primary_skill.ilike(service))
    if availability: stmt = stmt.where(Worker.availability_status == availability.upper())
    return [worker_out(w) for w in (await db.execute(stmt)).scalars().all()]
@app.get("/api/workers/nearby", tags=["Workers"])
async def nearby_workers(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), service: str = "", radius: float = Query(15, gt=0, le=100), db: AsyncSession = Depends(get_db)):
    workers = await list_workers(db=db)
    matches = find_smart_matches(workers, latitude, longitude, service, radius_km=radius)
    return matches
@app.get("/api/workers/{worker_id}", tags=["Workers"])
async def worker_detail(worker_id: int, db: AsyncSession = Depends(get_db)): return worker_out(await get_worker(db, worker_id))
@app.put("/api/workers/{worker_id}/availability", tags=["Workers"])
async def availability(worker_id: int, payload: WorkerAvailabilityUpdate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    worker = await get_worker(db, worker_id)
    if current.role != "admin" and worker.user_id != current.id: raise HTTPException(403, "You may only update your own worker profile")
    if payload.availability.upper() not in {"AVAILABLE","BUSY","ON_JOB","OFFLINE","ON_LEAVE"}: raise HTTPException(422, "Invalid availability status")
    worker.availability_status = payload.availability.upper(); return worker_out(worker)
@app.put("/api/workers/{worker_id}/location", tags=["Workers"])
async def location(worker_id: int, payload: WorkerLocationUpdate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    worker = await get_worker(db, worker_id)
    if current.role != "admin" and worker.user_id != current.id: raise HTTPException(403, "You may only update your own worker profile")
    worker.latitude, worker.longitude = payload.latitude, payload.longitude; return worker_out(worker)
@app.put("/api/workers/{worker_id}", tags=["Workers"])
async def update_worker(worker_id: int, payload: dict, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    worker = await get_worker(db, worker_id)
    if current.role != "admin" and worker.user_id != current.id: raise HTTPException(403, "You may only update your own worker profile")
    for field in {"experience_years","service_area","hourly_rate","bio","primary_skill","workload"}:
        if field in payload: setattr(worker, field, payload[field])
    return worker_out(worker)

@app.post("/api/service-requests", status_code=201, tags=["Service requests"])
async def create_request(payload: ServiceRequestCreate, db: AsyncSession = Depends(get_db), current: User = Depends(require_role(["customer"]))):
    customer = (await db.execute(select(Customer).where(Customer.user_id == current.id))).scalar_one()
    service_id = payload.service_id
    if not service_id and payload.service_name:
        service_id = (await db.execute(select(Service.id).where(Service.name.ilike(payload.service_name)))).scalar_one_or_none()
    if not service_id: raise HTTPException(422, "A valid service is required")
    row = ServiceRequest(customer_id=customer.id, service_id=service_id, **payload.model_dump(exclude={"service_id","service_name"})); db.add(row); await db.flush(); return row
@app.get("/api/service-requests", tags=["Service requests"])
async def requests(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    stmt = select(ServiceRequest).options(selectinload(ServiceRequest.service),selectinload(ServiceRequest.customer).selectinload(Customer.user))
    if current.role == "customer": stmt = stmt.join(Customer).where(Customer.user_id == current.id)
    return (await db.execute(stmt)).scalars().all()
@app.get("/api/service-requests/{request_id}", tags=["Service requests"])
async def request_detail(request_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    row = await db.get(ServiceRequest, request_id)
    if not row: raise HTTPException(404, "Service request not found")
    return row

@app.post("/api/bookings", status_code=201, tags=["Bookings"])
async def create_booking(payload: BookingCreate, db: AsyncSession = Depends(get_db), current: User = Depends(require_role(["customer"]))):
    customer = (await db.execute(select(Customer).where(Customer.user_id == current.id))).scalar_one(); worker = await get_worker(db, payload.worker_id)
    if worker.verification_status != "VERIFIED" or worker.availability_status != "AVAILABLE": raise HTTPException(409, "Worker is not currently eligible for booking")
    service = await db.get(Service, payload.service_id) if payload.service_id else (await db.execute(select(Service).where(Service.name.ilike(payload.service)))).scalar_one_or_none()
    if not service: raise HTTPException(422, "Service not found")
    request = ServiceRequest(customer_id=customer.id, service_id=service.id, description=f"Booking requested through Co-opServe", latitude=payload.customer_lat, longitude=payload.customer_lng, address=payload.address, status="MATCHED")
    db.add(request); await db.flush()
    distance = calculate_haversine_distance(payload.customer_lat, payload.customer_lng, worker.latitude, worker.longitude)
    booking = Booking(request_id=request.id, customer_id=customer.id, worker_id=worker.id, status="MATCHED", distance_km=round(distance,2), estimated_arrival=payload.eta_minutes or 12, total_amount=payload.amount or service.base_price, address=payload.address)
    db.add(booking); await db.flush(); await notify(db, current.id, "Worker assigned", f"{worker.user.name} has been matched to booking #{booking.id}."); await notify(db, worker.user_id, "New nearby job", f"Booking #{booking.id} is awaiting your acceptance.")
    return booking_out(await get_booking(db, booking.id))
@app.get("/api/bookings", tags=["Bookings"])
async def bookings(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    stmt = select(Booking).options(selectinload(Booking.customer).selectinload(Customer.user),selectinload(Booking.worker).selectinload(Worker.user),selectinload(Booking.request).selectinload(ServiceRequest.service),selectinload(Booking.payment),selectinload(Booking.invoice),selectinload(Booking.rating))
    if current.role == "customer": stmt = stmt.join(Customer).where(Customer.user_id == current.id)
    elif current.role == "worker": stmt = stmt.join(Worker).where(Worker.user_id == current.id)
    return [booking_out(b) for b in (await db.execute(stmt.order_by(Booking.created_at.desc()))).scalars().all()]
@app.get("/api/bookings/{booking_id}", tags=["Bookings"])
async def booking_detail(booking_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    booking = await get_booking(db, booking_id)
    if current.role == "customer" and booking.customer.user_id != current.id or current.role == "worker" and booking.worker.user_id != current.id: raise HTTPException(403, "Not authorized for this booking")
    return booking_out(booking)
@app.put("/api/bookings/{booking_id}/status", tags=["Bookings"])
async def booking_status(booking_id: int, payload: BookingStatusUpdate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    booking = await get_booking(db, booking_id)
    if current.role == "worker" and booking.worker.user_id != current.id: raise HTTPException(403, "Not your booking")
    if current.role == "customer" and booking.customer.user_id != current.id: raise HTTPException(403, "Not your booking")
    if current.role == "customer" and payload.status.upper() != "CANCELLED": raise HTTPException(403, "Customers may only cancel bookings")
    await transition_booking(db, booking, payload.status); return booking_out(booking)
@app.post("/api/bookings/{booking_id}/cancel", tags=["Bookings"])
async def cancel_booking(booking_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    return await booking_status(booking_id, BookingStatusUpdate(status="CANCELLED"), db, current)

@app.post("/api/payments/create", tags=["Payments"])
async def payment_create(payload: PaymentCreateRequest, db: AsyncSession = Depends(get_db), current: User = Depends(require_role(["customer"]))):
    booking = await get_booking(db, payload.booking_id)
    if booking.customer.user_id != current.id: raise HTTPException(403, "Not your booking")
    if booking.status != "COMPLETED": raise HTTPException(409, "Payment can only start after service completion")
    if booking.payment: return {"id":booking.payment.id,"status":booking.payment.status,"transaction_reference":booking.payment.transaction_reference}
    payment = Payment(booking_id=booking.id, amount=payload.amount or booking.total_amount, payment_method=payload.payment_method, transaction_reference=f"DEMO-TXN-{booking.id}-{int(datetime.utcnow().timestamp())}", status="PENDING")
    db.add(payment); await db.flush(); return {"id":payment.id,"status":payment.status,"transaction_reference":payment.transaction_reference}
@app.post("/api/payments/verify", tags=["Payments"])
async def payment_verify(payload: PaymentVerifyRequest, db: AsyncSession = Depends(get_db), current: User = Depends(require_role(["customer"]))):
    booking = await get_booking(db, payload.booking_id)
    if booking.customer.user_id != current.id: raise HTTPException(403, "Not your booking")
    if not booking.payment or booking.payment.transaction_reference != payload.transaction_reference: raise HTTPException(404, "Sandbox transaction not found")
    booking.payment.status = "SUCCESS"; booking.payment.paid_at = datetime.utcnow(); await transition_booking(db, booking, "PAID"); await notify(db, current.id, "Payment successful", f"Payment for booking #{booking.id} was successful.", "payment")
    return {"id":booking.payment.id,"status":booking.payment.status,"transaction_reference":booking.payment.transaction_reference}
@app.get("/api/payments/{payment_id}", tags=["Payments"])
async def payment_detail(payment_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    payment = await db.get(Payment, payment_id)
    if not payment: raise HTTPException(404, "Payment not found")
    return payment

@app.post("/api/ratings", status_code=201, tags=["Ratings"])
async def create_rating(payload: RatingCreateRequest, db: AsyncSession = Depends(get_db), current: User = Depends(require_role(["customer"]))):
    booking = await get_booking(db, payload.booking_id)
    if booking.customer.user_id != current.id: raise HTTPException(403, "Not your booking")
    if booking.status != "PAID": raise HTTPException(409, "Rating can only be submitted after payment")
    if booking.rating: raise HTTPException(409, "Booking already has a rating")
    rating = Rating(booking_id=booking.id, customer_id=booking.customer_id, worker_id=booking.worker_id, rating=payload.rating, review=payload.review); db.add(rating); await db.flush(); await transition_booking(db, booking, "RATED"); return rating
@app.get("/api/workers/{worker_id}/ratings", tags=["Ratings"])
async def worker_ratings(worker_id: int, db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(Rating).where(Rating.worker_id == worker_id).order_by(Rating.created_at.desc()))).scalars().all()

@app.get("/api/notifications", tags=["Notifications"])
async def notifications(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    rows = (await db.execute(select(Notification).where(Notification.user_id == current.id).order_by(Notification.created_at.desc()))).scalars().all()
    return [{"id":str(n.id),"role":current.role,"title":n.title,"message":n.message,"time":n.created_at.isoformat(),"read":n.is_read,"type":n.type} for n in rows]
@app.put("/api/notifications/{notification_id}/read", tags=["Notifications"])
async def read_notification(notification_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    row = await db.get(Notification, notification_id)
    if not row: raise HTTPException(404, "Notification not found")
    if row.user_id != current.id: raise HTTPException(403, "Not your notification")
    row.is_read = True; return {"id":row.id,"read":True}

@app.get("/api/admin/dashboard", tags=["Admin"])
@app.get("/api/admin/analytics", tags=["Admin"])
async def admin_dashboard(db: AsyncSession = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    workers = (await db.execute(select(Worker))).scalars().all()
    bookings_res = await db.execute(
        select(Booking).options(
            selectinload(Booking.request).selectinload(ServiceRequest.service)
        )
    )
    bookings = bookings_res.scalars().all()
    active = sum(b.status in ACTIVE_BOOKING_STATES for b in bookings)
    completed = sum(b.status in {"COMPLETED", "PAID", "RATED"} for b in bookings)
    paid_total = sum(b.total_amount for b in bookings if b.status in {"PAID", "RATED"})

    # Aggregate top services
    service_counts = {}
    for b in bookings:
        svc_name = b.request.service.name if (b.request and b.request.service) else "Other"
        service_counts[svc_name] = service_counts.get(svc_name, 0) + 1
    total_b = len(bookings) or 1
    top_services = [
        {"name": k, "count": v, "percentage": round((v / total_b) * 100)}
        for k, v in sorted(service_counts.items(), key=lambda item: item[1], reverse=True)[:5]
    ]

    return {
        "totalWorkers": len(workers),
        "verifiedWorkers": sum(w.verification_status == "VERIFIED" for w in workers),
        "activeJobs": active,
        "completedJobs": completed,
        "pendingJobs": sum(b.status in {"REQUESTED", "MATCHED"} for b in bookings),
        "workerUtilization": round((sum(w.availability_status != "AVAILABLE" for w in workers) / len(workers) * 100) if workers else 0, 1),
        "totalRequests": len(bookings),
        "revenue": paid_total,
        "workerEarnings": round(paid_total * 0.75, 2),
        "averageRating": round(sum(w.rating for w in workers) / len(workers), 2) if workers else 0,
        "topServices": top_services,
        "demandByArea": [
            {"zone": "Bengaluru Central", "requests": len(bookings), "activeWorkers": sum(w.availability_status == "AVAILABLE" for w in workers)},
            {"zone": "Indiranagar", "requests": max(4, round(len(bookings) * 0.4)), "activeWorkers": sum(w.availability_status == "AVAILABLE" for w in workers[:15])},
            {"zone": "Koramangala", "requests": max(3, round(len(bookings) * 0.35)), "activeWorkers": sum(w.availability_status == "AVAILABLE" for w in workers[15:30])}
        ]
    }

@app.get("/api/admin/workers", tags=["Admin"])
async def admin_workers(db: AsyncSession = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    return await list_workers(db=db)

@app.put("/api/admin/workers/{worker_id}/verify", tags=["Admin"])
@app.put("/api/workers/{worker_id}/verification", tags=["Workers"])
async def verify_worker(worker_id: int, payload: WorkerVerificationUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    worker = await get_worker(db, worker_id)
    status_upper = payload.verification_status.upper()
    if status_upper not in {"VERIFIED", "REJECTED", "PENDING"}:
        raise HTTPException(422, "Invalid verification status. Must be VERIFIED, REJECTED, or PENDING")
    worker.verification_status = status_upper
    await notify(db, worker.user_id, f"Verification {status_upper.lower()}", f"Your worker profile verification status has been updated to {status_upper}.")
    return worker_out(worker)

@app.get("/api/admin/bookings", tags=["Admin"])
async def admin_bookings(db: AsyncSession = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    stmt = select(Booking).options(
        selectinload(Booking.customer).selectinload(Customer.user),
        selectinload(Booking.worker).selectinload(Worker.user),
        selectinload(Booking.request).selectinload(ServiceRequest.service),
        selectinload(Booking.payment),
        selectinload(Booking.invoice),
        selectinload(Booking.rating)
    )
    return [booking_out(b) for b in (await db.execute(stmt.order_by(Booking.created_at.desc()))).scalars().all()]

@app.post("/api/ai/match", tags=["AI"])
async def ai_match(latitude: float, longitude: float, service: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await nearby_workers(latitude, longitude, service, 15, db)

@app.get("/api/ai/forecast", tags=["AI"])
async def ai_forecast(service: Optional[str] = None, location: str = "Central Zone", target_date: Optional[date] = None, db: AsyncSession = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    return await forecast(db, service, location, target_date)

@app.get("/api/ai/workforce-recommendation", tags=["AI"])
async def ai_workforce(service: Optional[str] = None, location: str = "Central Zone", db: AsyncSession = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    return await workforce_recommendation(db, service, location)

# --- AI CHATBOT ENDPOINTS ---
@app.post("/api/chat/message", response_model=ChatMessageOut, tags=["AI Chatbot"])
async def chat_message(payload: ChatMessageRequest, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    """Sends a user message to the AI Assistant and returns reply + rich action widgets."""
    return await handle_user_message(db, current, payload)

@app.get("/api/chat/history", response_model=ChatHistoryOut, tags=["AI Chatbot"])
async def chat_history(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    """Retrieves session message history for authenticated user."""
    return await get_session_history(db, current)

@app.delete("/api/chat/history", tags=["AI Chatbot"])
async def chat_clear(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    """Clears session message history and resets conversation context."""
    await clear_session_history(db, current)
    return {"status": "success", "message": "Chat history cleared"}
