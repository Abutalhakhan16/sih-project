from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="customer")  # 'customer', 'worker', 'admin'
    language = Column(String(10), default="en")  # 'en', 'hi'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer_profile = relationship("Customer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    worker_profile = relationship("Worker", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Cooperative(Base):
    __tablename__ = "cooperatives"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    contact = Column(String(100), nullable=True)
    status = Column(String(50), default="Active")

    workers = relationship("Worker", back_populates="cooperative")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    preferred_language = Column(String(10), default="en")

    user = relationship("User", back_populates="customer_profile")
    service_requests = relationship("ServiceRequest", back_populates="customer")
    bookings = relationship("Booking", back_populates="customer")
    ratings = relationship("Rating", back_populates="customer")


class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    cooperative_id = Column(Integer, ForeignKey("cooperatives.id"), nullable=True)
    experience_years = Column(Integer, default=1)
    rating = Column(Float, default=5.0)
    completed_jobs = Column(Integer, default=0)
    availability_status = Column(String(50), default="AVAILABLE", index=True)  # AVAILABLE, BUSY, ON_JOB, OFFLINE, ON_LEAVE
    verification_status = Column(String(50), default="VERIFIED")  # VERIFIED, PENDING, REJECTED
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    service_area = Column(String(255), default="Bengaluru")
    hourly_rate = Column(Float, default=350.0)
    insurance_status = Column(String(100), default="Active (₹5,00,000 Group Cover)")
    workload = Column(Integer, default=0)
    bio = Column(Text, nullable=True)
    primary_skill = Column(String(100), nullable=True, index=True)
    color = Column(String(50), default="blue")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="worker_profile")
    cooperative = relationship("Cooperative", back_populates="workers")
    skills = relationship("WorkerSkill", back_populates="worker", cascade="all, delete-orphan")
    certifications = relationship("Certification", back_populates="worker", cascade="all, delete-orphan")
    welfare = relationship("Welfare", back_populates="worker", uselist=False, cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="worker")
    ratings = relationship("Rating", back_populates="worker")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    workers = relationship("WorkerSkill", back_populates="skill")


class WorkerSkill(Base):
    __tablename__ = "worker_skills"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    proficiency = Column(String(50), default="Expert")
    verified = Column(Boolean, default=True)

    worker = relationship("Worker", back_populates="skills")
    skill = relationship("Skill", back_populates="workers")


class Certification(Base):
    __tablename__ = "certifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False)
    certificate_name = Column(String(255), nullable=False)
    issuing_authority = Column(String(255), nullable=True)
    issue_date = Column(String(50), nullable=True)
    expiry_date = Column(String(50), nullable=True)
    verification_status = Column(String(50), default="Verified")
    document_url = Column(String(500), nullable=True)

    worker = relationship("Worker", back_populates="certifications")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category = Column(String(100), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    base_price = Column(Float, default=350.0)
    estimated_duration = Column(String(50), default="1-2 hrs")
    required_skill = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    service_requests = relationship("ServiceRequest", back_populates="service")


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=True)
    priority = Column(String(50), default="Standard")
    preferred_date = Column(String(50), nullable=True)
    preferred_time = Column(String(50), nullable=True)
    status = Column(String(50), default="REQUESTED")  # REQUESTED, MATCHED, CANCELLED, FULFILLED
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="service_requests")
    service = relationship("Service", back_populates="service_requests")
    bookings = relationship("Booking", back_populates="request")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey("service_requests.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False)
    scheduled_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="REQUESTED", index=True)
    # State machine: REQUESTED -> MATCHED -> ACCEPTED -> ON_THE_WAY -> ARRIVED -> IN_PROGRESS -> COMPLETED -> PAID -> RATED | CANCELLED, REJECTED
    distance_km = Column(Float, default=1.0)
    estimated_arrival = Column(Integer, default=12)  # minutes
    total_amount = Column(Float, default=350.0)
    address = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="bookings")
    worker = relationship("Worker", back_populates="bookings")
    request = relationship("ServiceRequest", back_populates="bookings")
    payment = relationship("Payment", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    invoice = relationship("Invoice", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    rating = relationship("Rating", back_populates="booking", uselist=False, cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), default="Co-op Wallet Pay")
    transaction_reference = Column(String(100), unique=True, nullable=False)
    status = Column(String(50), default="SUCCESS")  # PENDING, SUCCESS, FAILED
    paid_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="payment")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    invoice_number = Column(String(100), unique=True, nullable=False)
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    worker_earnings = Column(Float, nullable=False)  # 75%
    coop_fee = Column(Float, nullable=False)         # 20%
    community_fund = Column(Float, nullable=False)   # 5%
    issued_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="invoice")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Float, nullable=False)
    review = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="rating")
    customer = relationship("Customer", back_populates="ratings")
    worker = relationship("Worker", back_populates="ratings")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="booking")  # booking, payment, welfare, system
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class Welfare(Base):
    __tablename__ = "welfare"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), unique=True, nullable=False)
    insurance_status = Column(String(100), default="Active (₹5,00,000 Group Cover)")
    benefit_status = Column(String(100), default="Eligible for Co-op Micro-credit")
    training_status = Column(String(100), default="NSDC Skill Certification - Level 4")
    leave_balance = Column(Integer, default=14)

    worker = relationship("Worker", back_populates="welfare")
