"""Idempotent, clearly synthetic data used only in development/demo mode."""
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.entities import (User, Customer, Worker, Cooperative, Skill,
    WorkerSkill, Certification, Service, ServiceRequest, Booking, Notification, Welfare,
    Payment, Invoice, Rating)
from backend.app.services.auth_service import get_password_hash
from backend.app.config import settings

DEMO_MARKER = "[DEMO]"
SERVICES = [
    ("Home repair", "Plumber", "Leak repair, fixtures and installations", 450, "1-2 hrs"),
    ("Home repair", "Electrician", "Safe electrical repairs and installations", 500, "1-2 hrs"),
    ("Cleaning", "Home cleaning", "Deep and regular home cleaning", 650, "2-3 hrs"),
    ("Appliances", "Appliance repair", "Repair for common household appliances", 550, "1-2 hrs"),
    ("Home repair", "Carpenter", "Furniture and small woodwork repairs", 500, "1-2 hrs"),
    ("Care", "Elder care", "Non-medical assisted care at home", 700, "2-4 hrs"),
    ("Home repair", "Painter", "Interior touch-ups and wall painting", 600, "3-5 hrs"),
    ("Cleaning", "Pest control", "Safe household pest treatment", 800, "2-3 hrs"),
    ("Appliances", "AC service", "Cleaning and servicing air conditioners", 650, "1-2 hrs"),
    ("Appliances", "Refrigerator repair", "Diagnosis and repair for refrigerators", 600, "1-2 hrs"),
    ("Home repair", "Locksmith", "Home lock repair and replacement", 450, "1 hr"),
    ("Care", "Child care", "Verified in-home child care support", 750, "3-5 hrs"),
    ("Cleaning", "Laundry service", "Wash, fold and pickup laundry service", 350, "1 day"),
    ("Home repair", "Mason", "Small masonry and tile repairs", 650, "2-4 hrs"),
    ("Home repair", "Gardener", "Garden maintenance and landscaping", 450, "2-3 hrs"),
    ("Technology", "Computer repair", "Home computer and network support", 550, "1-2 hrs"),
    ("Technology", "Mobile repair", "Mobile device diagnostics and repair", 500, "1-2 hrs"),
    ("Home repair", "Water purifier service", "Filter replacement and purifier service", 450, "1 hr"),
]
NAMES = ["Ravi Kumar", "Priya Shah", "Amit Verma", "Sunita Devi", "Arjun Rao", "Meera Iyer", "Kiran Patel", "Nisha Singh", "Vijay Das", "Kavita Jain"]

async def seed_demo_data(db: AsyncSession) -> None:
    # 1. Ensure skills and services exist
    skills_map = {}
    existing_skills = (await db.execute(select(Skill))).scalars().all()
    if not existing_skills:
        for _, name, description, _, _ in SERVICES:
            skill = Skill(name=name, description=description)
            db.add(skill)
            skills_map[name] = skill
        await db.flush()
    else:
        for s in existing_skills:
            skills_map[s.name] = s

    existing_services = (await db.execute(select(Service))).scalars().all()
    service_rows = list(existing_services)
    if not existing_services:
        for category, name, desc, price, duration in SERVICES:
            row = Service(
                category=category,
                name=name,
                description=f"{DEMO_MARKER} {desc}",
                base_price=price,
                estimated_duration=duration,
                required_skill=name
            )
            db.add(row)
            service_rows.append(row)
        await db.flush()

    # 2. Ensure cooperatives exist
    coop1 = (await db.execute(select(Cooperative).where(Cooperative.name.ilike("%Bengaluru%")))).scalar_one_or_none()
    if not coop1:
        coop1 = Cooperative(name="Bengaluru Service Cooperative", location="Bengaluru Central", contact="bengaluru@coopserve.local", status="Active")
        db.add(coop1)
        await db.flush()

    coop2 = (await db.execute(select(Cooperative).where(Cooperative.name.ilike("%Karnataka%")))).scalar_one_or_none()
    if not coop2:
        coop2 = Cooperative(name="Karnataka Artisans Cooperative", location="Bengaluru East", contact="artisans@coopserve.local", status="Active")
        db.add(coop2)
        await db.flush()

    demo_pw_hash = get_password_hash(settings.DEMO_PASSWORD)

    # 3. Canonical Demo Customer (demo.customer@coopserve.test)
    demo_cust_user = (await db.execute(select(User).where(User.email == "demo.customer@coopserve.test"))).scalar_one_or_none()
    if not demo_cust_user:
        demo_cust_user = User(
            name="Ananya Nair",
            email="demo.customer@coopserve.test",
            phone="9000000001",
            password_hash=demo_pw_hash,
            role="customer",
            language="en"
        )
        db.add(demo_cust_user)
        await db.flush()
        demo_cust_profile = Customer(user_id=demo_cust_user.id, preferred_language="en")
        db.add(demo_cust_profile)
        await db.flush()
    else:
        demo_cust_profile = (await db.execute(select(Customer).where(Customer.user_id == demo_cust_user.id))).scalar_one_or_none()
        if not demo_cust_profile:
            demo_cust_profile = Customer(user_id=demo_cust_user.id, preferred_language="en")
            db.add(demo_cust_profile)
            await db.flush()

    # Backward compatibility: customer@coopserve.demo
    compat_cust = (await db.execute(select(User).where(User.email == "customer@coopserve.demo"))).scalar_one_or_none()
    if not compat_cust:
        compat_cust = User(
            name="Ananya Nair",
            email="customer@coopserve.demo",
            phone="9000000011",
            password_hash=get_password_hash(settings.DEMO_CUSTOMER_PASSWORD),
            role="customer",
            language="en"
        )
        db.add(compat_cust)
        await db.flush()
        db.add(Customer(user_id=compat_cust.id, preferred_language="en"))
        await db.flush()

    # 4. Canonical Demo Admin (demo.admin@coopserve.test)
    demo_admin_user = (await db.execute(select(User).where(User.email == "demo.admin@coopserve.test"))).scalar_one_or_none()
    if not demo_admin_user:
        demo_admin_user = User(
            name="Cooperative Admin",
            email="demo.admin@coopserve.test",
            phone="9000000002",
            password_hash=demo_pw_hash,
            role="admin",
            language="en"
        )
        db.add(demo_admin_user)
        await db.flush()

    # Backward compatibility: admin@coopserve.demo
    compat_admin = (await db.execute(select(User).where(User.email == "admin@coopserve.demo"))).scalar_one_or_none()
    if not compat_admin:
        compat_admin = User(
            name="Cooperative Admin",
            email="admin@coopserve.demo",
            phone="9000000012",
            password_hash=get_password_hash(settings.DEMO_ADMIN_PASSWORD),
            role="admin",
            language="en"
        )
        db.add(compat_admin)
        await db.flush()

    # 5. Canonical Demo Worker (demo.worker@coopserve.test)
    demo_worker_user = (await db.execute(select(User).where(User.email == "demo.worker@coopserve.test"))).scalar_one_or_none()
    if not demo_worker_user:
        demo_worker_user = User(
            name="Ravi Kumar",
            email="demo.worker@coopserve.test",
            phone="9000000003",
            password_hash=demo_pw_hash,
            role="worker",
            language="hi"
        )
        db.add(demo_worker_user)
        await db.flush()
        demo_worker_profile = Worker(
            user_id=demo_worker_user.id,
            cooperative_id=coop1.id,
            experience_years=5,
            rating=4.9,
            completed_jobs=28,
            availability_status="AVAILABLE",
            verification_status="VERIFIED",
            latitude=12.9716,
            longitude=77.5946,
            service_area="Bengaluru Central",
            hourly_rate=450.0,
            insurance_status="Active (₹5,00,000 Group Cover)",
            workload=1,
            bio="Certified master technician specializing in domestic and commercial plumbing and leak repairs.",
            primary_skill="Plumber",
            color="peach"
        )
        db.add(demo_worker_profile)
        await db.flush()

        plumber_skill = skills_map.get("Plumber")
        if plumber_skill:
            db.add(WorkerSkill(worker_id=demo_worker_profile.id, skill_id=plumber_skill.id, proficiency="Master", verified=True))
        electrician_skill = skills_map.get("Electrician")
        if electrician_skill:
            db.add(WorkerSkill(worker_id=demo_worker_profile.id, skill_id=electrician_skill.id, proficiency="Intermediate", verified=True))

        db.add(Certification(
            worker_id=demo_worker_profile.id,
            certificate_name="NSDC Level 4 Plumber Certification",
            issuing_authority="National Skill Development Corporation",
            issue_date="2024-01-15",
            expiry_date="2027-01-15",
            verification_status="Verified"
        ))
        db.add(Certification(
            worker_id=demo_worker_profile.id,
            certificate_name="Cooperative Safety & Quality Standard - Grade A",
            issuing_authority="Bengaluru Service Cooperative",
            issue_date="2024-03-01",
            expiry_date="2026-03-01",
            verification_status="Verified"
        ))
        db.add(Welfare(worker_id=demo_worker_profile.id, leave_balance=16))
        await db.flush()
    else:
        demo_worker_profile = (await db.execute(select(Worker).where(Worker.user_id == demo_worker_user.id))).scalar_one_or_none()


    # 6. Additional seeded workers (if less than 10 exist)
    total_workers_count = (await db.execute(select(Worker.id))).scalars().all()
    if len(total_workers_count) < 10:
        for index in range(1, 25):
            service = SERVICES[index % len(SERVICES)][1]
            user = User(
                name=f"{NAMES[index % len(NAMES)]} {index + 1}",
                email=f"worker{index + 1}@coopserve.demo",
                phone=f"90000{index:05d}",
                password_hash=demo_pw_hash,
                role="worker",
                language="hi" if index % 3 == 0 else "en"
            )
            db.add(user)
            await db.flush()
            worker = Worker(
                user_id=user.id,
                cooperative_id=coop1.id if index % 2 == 0 else coop2.id,
                experience_years=2 + index % 10,
                rating=round(4.2 + (index % 8) / 10, 1),
                completed_jobs=5 + index * 2,
                availability_status="AVAILABLE" if index % 4 != 0 else "BUSY",
                verification_status="PENDING" if index % 7 == 0 else "VERIFIED",
                latitude=12.9716 + ((index % 7) - 3) * 0.012,
                longitude=77.5946 + ((index % 8) - 4) * 0.012,
                service_area="Bengaluru Central" if index % 2 == 0 else "Indiranagar",
                hourly_rate=SERVICES[index % len(SERVICES)][3],
                workload=index % 4,
                bio=f"Skilled cooperative worker specializing in {service.lower()}.",
                primary_skill=service,
                color=["blue", "mint", "peach", "lilac"][index % 4]
            )
            db.add(worker)
            await db.flush()
            if service in skills_map:
                db.add(WorkerSkill(worker_id=worker.id, skill_id=skills_map[service].id, proficiency="Expert", verified=True))
            db.add(Certification(
                worker_id=worker.id,
                certificate_name=f"NSDC {service} Skill Standard",
                issuing_authority="NSDC",
                issue_date="2025-01-01",
                expiry_date="2028-01-01",
                verification_status="Verified"
            ))
            db.add(Welfare(worker_id=worker.id))
        await db.flush()

    # 7. Seed Bookings, Payments, Invoices, Ratings for demo customer & worker
    cust_bookings_count = (await db.execute(select(Booking.id).where(Booking.customer_id == demo_cust_profile.id))).scalars().all()
    if not cust_bookings_count and service_rows and demo_worker_profile:
        statuses = ["COMPLETED", "COMPLETED", "IN_PROGRESS", "ACCEPTED", "MATCHED"]
        for idx, stat in enumerate(statuses):
            svc = service_rows[idx % len(service_rows)]
            req = ServiceRequest(
                customer_id=demo_cust_profile.id,
                service_id=svc.id,
                description=f"Household service request for {svc.name}",
                latitude=12.9716,
                longitude=77.5946,
                address="Indiranagar 100ft Road, Bengaluru",
                priority="Standard",
                status="FULFILLED" if stat == "COMPLETED" else "MATCHED"
            )
            db.add(req)
            await db.flush()

            booking = Booking(
                request_id=req.id,
                customer_id=demo_cust_profile.id,
                worker_id=demo_worker_profile.id,
                scheduled_at=datetime.utcnow() - timedelta(days=idx * 2) if stat == "COMPLETED" else datetime.utcnow() + timedelta(hours=idx * 3),
                status=stat,
                distance_km=1.8,
                estimated_arrival=12,
                total_amount=svc.base_price,
                address="Indiranagar 100ft Road, Bengaluru"
            )
            db.add(booking)
            await db.flush()

            if stat == "COMPLETED":
                # Create payment
                payment = Payment(
                    booking_id=booking.id,
                    amount=svc.base_price,
                    payment_method="Co-op Wallet Pay",
                    transaction_reference=f"TXN-COOP-{booking.id}-{1000 + idx}",
                    status="SUCCESS",
                    paid_at=datetime.utcnow() - timedelta(days=idx * 2)
                )
                db.add(payment)
                # Create invoice
                invoice = Invoice(
                    booking_id=booking.id,
                    invoice_number=f"INV-2026-{1000 + booking.id}",
                    subtotal=svc.base_price,
                    tax=0.0,
                    total=svc.base_price,
                    worker_earnings=round(svc.base_price * 0.75, 2),
                    coop_fee=round(svc.base_price * 0.20, 2),
                    community_fund=round(svc.base_price * 0.05, 2),
                    issued_at=datetime.utcnow() - timedelta(days=idx * 2)
                )
                db.add(invoice)
                # Create rating
                rating = Rating(
                    booking_id=booking.id,
                    customer_id=demo_cust_profile.id,
                    worker_id=demo_worker_profile.id,
                    rating=5.0 if idx == 0 else 4.8,
                    review="Exceptional service! Quick, professional, and very polite worker."
                )
                db.add(rating)

        await db.flush()

    # 8. Notifications
    existing_notifs = (await db.execute(select(Notification.id).where(Notification.user_id == demo_cust_user.id))).scalars().all()
    if not existing_notifs:
        db.add_all([
            Notification(user_id=demo_cust_user.id, title="Welcome to Co-opServe", message="Your demo customer account is loaded with sample bookings and active requests.", type="system"),
            Notification(user_id=demo_cust_user.id, title="Worker En Route", message="Ravi Kumar has accepted your Plumbing request and is heading your way.", type="booking"),
            Notification(user_id=demo_worker_user.id, title="Profile Verified", message="Your cooperative credentials and certifications have been verified by Admin.", type="welfare"),
            Notification(user_id=demo_worker_user.id, title="Payout Processed", message="Weekly dividend payout of ₹3,600 credited to your cooperative account.", type="payment"),
        ])
        await db.flush()

