"""Idempotent, clearly synthetic data used only in development/demo mode."""
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.entities import (User, Customer, Worker, Cooperative, Skill,
    WorkerSkill, Certification, Service, ServiceRequest, Booking, Notification, Welfare)
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
    if (await db.execute(select(User.id).limit(1))).scalar_one_or_none():
        return
    coop = Cooperative(name=f"{DEMO_MARKER} Bengaluru Service Cooperative", location="Bengaluru", contact="demo@coopserve.local")
    db.add(coop); await db.flush()
    skills = {}
    for _, name, description, _, _ in SERVICES:
        skill = Skill(name=name, description=description); db.add(skill); skills[name] = skill
    await db.flush()
    service_rows = []
    for category, name, desc, price, duration in SERVICES:
        row = Service(category=category, name=name, description=f"{DEMO_MARKER} {desc}", base_price=price, estimated_duration=duration, required_skill=name)
        db.add(row); service_rows.append(row)
    await db.flush()
    customer = User(name=f"{DEMO_MARKER} Ananya Nair", email="customer@coopserve.demo", phone="9000000001", password_hash=get_password_hash(settings.DEMO_CUSTOMER_PASSWORD), role="customer", language="en")
    admin = User(name=f"{DEMO_MARKER} Cooperative Admin", email="admin@coopserve.demo", phone="9000000002", password_hash=get_password_hash(settings.DEMO_ADMIN_PASSWORD), role="admin", language="en")
    db.add_all([customer, admin]); await db.flush()
    customer_profile = Customer(user_id=customer.id, preferred_language="en"); db.add(customer_profile); await db.flush()
    workers = []
    for index in range(36):
        service = SERVICES[index % len(SERVICES)][1]
        user = User(name=f"{DEMO_MARKER} {NAMES[index % len(NAMES)]} {index + 1}", email=f"worker{index + 1}@coopserve.demo", phone=f"90000{index:05d}", password_hash=get_password_hash(settings.DEMO_WORKER_PASSWORD), role="worker", language="hi" if index % 3 == 0 else "en")
        db.add(user); await db.flush()
        worker = Worker(user_id=user.id, cooperative_id=coop.id, experience_years=2 + index % 12, rating=round(4.1 + (index % 9) / 10, 1), completed_jobs=6 + index * 3, availability_status="AVAILABLE" if index % 5 else "BUSY", verification_status="PENDING" if index % 11 == 0 else "VERIFIED", latitude=12.9716 + ((index % 7) - 3) * .012, longitude=77.5946 + ((index % 8) - 4) * .012, service_area="Bengaluru Central", hourly_rate=SERVICES[index % len(SERVICES)][3], workload=index % 4, bio=f"{DEMO_MARKER} Community-trained {service.lower()} specialist.", primary_skill=service, color=["blue", "mint", "peach", "lilac"][index % 4])
        db.add(worker); await db.flush(); workers.append(worker)
        db.add(WorkerSkill(worker_id=worker.id, skill_id=skills[service].id, proficiency="Expert", verified=True))
        db.add(Certification(worker_id=worker.id, certificate_name=f"{DEMO_MARKER} NSDC {service} Level 4", issuing_authority="NSDC", issue_date="2025-01-01", expiry_date="2028-01-01", verification_status="Verified"))
        db.add(Welfare(worker_id=worker.id))
    for index in range(18):
        user = User(name=f"{DEMO_MARKER} Customer {index + 2}", email=f"customer{index + 2}@coopserve.demo", phone=f"91000{index:05d}", password_hash=get_password_hash(settings.DEMO_CUSTOMER_PASSWORD), role="customer", language="en")
        db.add(user); await db.flush(); db.add(Customer(user_id=user.id, preferred_language="en"))
    await db.flush()
    statuses = ["REQUESTED", "ACCEPTED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED"]
    for index in range(40):
        service = service_rows[index % len(service_rows)]; worker = workers[index % len(workers)]
        request = ServiceRequest(customer_id=customer_profile.id, service_id=service.id, description=f"{DEMO_MARKER} Request for {service.name}", latitude=12.9716, longitude=77.5946, address="Indiranagar, Bengaluru", priority="Standard", status="MATCHED")
        db.add(request); await db.flush()
        db.add(Booking(request_id=request.id, customer_id=customer_profile.id, worker_id=worker.id, scheduled_at=datetime.utcnow() + timedelta(days=index % 6), status=statuses[index % len(statuses)], distance_km=round(1 + index * .12, 2), estimated_arrival=10 + index % 15, total_amount=service.base_price, address="Indiranagar, Bengaluru"))
    db.add_all([
        Notification(user_id=customer.id, title="Demo data ready", message="Your Co-opServe demo account is ready to explore.", type="system"),
        Notification(user_id=workers[0].user_id, title="New nearby job", message="A demo service request is available nearby.", type="booking"),
    ])
