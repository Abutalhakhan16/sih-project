from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# --- AUTH SCHEMAS ---
class RegisterRequest(BaseModel):
    name: str
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str
    confirm_password: Optional[str] = None
    phone: Optional[str] = None
    role: str = "customer"  # 'customer', 'worker'
    language: str = "en"
    # Worker-specific registration fields
    service: Optional[str] = "Plumber"
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = 1
    cooperative: Optional[str] = None
    cooperative_id: Optional[int] = None
    service_area: Optional[str] = "Bengaluru"
    hourly_rate: Optional[float] = 350.0
    latitude: Optional[float] = 12.9716
    longitude: Optional[float] = 77.5946

class LoginRequest(BaseModel):
    email: Optional[str] = None
    identifier: Optional[str] = None
    phone: Optional[str] = None
    password: str

    def get_identifier(self) -> str:
        val = self.identifier or self.email or self.phone
        if not val:
            raise ValueError("Email or mobile number is required")
        return val.strip()

class DemoLoginRequest(BaseModel):
    role: str = "customer"  # 'customer', 'worker', 'admin'

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    role: str
    language: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None

# --- WORKER SCHEMAS ---
class CertificationOut(BaseModel):
    id: int
    certificate_name: str
    issuing_authority: Optional[str] = None
    issue_date: Optional[str] = None
    verification_status: str

    model_config = ConfigDict(from_attributes=True)

class SkillOut(BaseModel):
    name: str
    proficiency: str

class WorkerOut(BaseModel):
    id: int
    name: str
    initials: str
    phone: str
    service: str
    primarySkill: str
    secondarySkills: List[str] = []
    experience: int
    certifications: List[str] = []
    rating: float
    reviews: int
    completedJobs: int
    availability: str
    currentStatus: str
    price: float
    hourlyRate: float
    color: str
    bio: Optional[str] = None
    lat: float
    lng: float
    serviceArea: str
    verified: bool
    verificationStatus: str
    cooperative: str
    language: List[str] = ["English", "Hindi"]
    workload: int
    insuranceStatus: str
    address: Optional[str] = None
    distance: Optional[float] = None
    etaMinutes: Optional[int] = None
    matchScore: Optional[int] = None
    isEligible: Optional[bool] = None
    disqualificationReason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class WorkerAvailabilityUpdate(BaseModel):
    availability: str  # AVAILABLE, BUSY, ON_JOB, OFFLINE, ON_LEAVE

class WorkerVerificationUpdate(BaseModel):
    verification_status: str  # VERIFIED, REJECTED, PENDING
    notes: Optional[str] = None

class WorkerLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None

class RankedWorkerOut(WorkerOut):
    distanceKm: float
    etaMinutes: int
    matchScore: int
    isEligible: bool
    disqualificationReason: Optional[str] = None

class SmartMatchResultOut(BaseModel):
    bestWorker: Optional[RankedWorkerOut] = None
    rankedWorkers: List[RankedWorkerOut] = []
    totalFound: int = 0
    explanation: str = ""

# --- SERVICE SCHEMAS ---
class ServiceOut(BaseModel):
    id: int
    category: str
    name: str
    description: Optional[str] = None
    base_price: float
    estimated_duration: str
    required_skill: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class ServiceCreate(BaseModel):
    category: str
    name: str
    description: Optional[str] = None
    base_price: float
    estimated_duration: str = "1-2 hrs"
    required_skill: Optional[str] = None

# --- SERVICE REQUEST SCHEMAS ---
class ServiceRequestCreate(BaseModel):
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    priority: str = "Standard"
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None

# --- BOOKING SCHEMAS ---
class BookingCreate(BaseModel):
    worker_id: int
    service: str
    service_id: Optional[int] = None
    request_id: Optional[int] = None
    customer_lat: float
    customer_lng: float
    address: Optional[str] = "Current Location"
    amount: float
    eta_minutes: Optional[int] = 12

class BookingStatusUpdate(BaseModel):
    status: str  # MATCHED, ACCEPTED, ON_THE_WAY, ARRIVED, IN_PROGRESS, COMPLETED, PAID, RATED, CANCELLED, REJECTED
    notes: Optional[str] = None

class InvoiceOut(BaseModel):
    id: int
    booking_id: int
    invoice_number: str
    subtotal: float
    tax: float
    total: float
    worker_earnings: float
    coop_fee: float
    community_fund: float
    issued_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaymentOut(BaseModel):
    id: int
    booking_id: int
    amount: float
    payment_method: str
    transaction_reference: str
    status: str
    paid_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BookingOut(BaseModel):
    id: int
    service: str
    serviceId: Optional[str] = None
    worker: str
    workerId: int
    customerId: int
    customerName: str
    workerLat: Optional[float] = None
    workerLng: Optional[float] = None
    customerLat: Optional[float] = None
    customerLng: Optional[float] = None
    date: str
    status: str
    amount: float
    etaMinutes: Optional[int] = None
    address: Optional[str] = None
    invoiceNumber: Optional[str] = None
    rating: Optional[float] = None
    review: Optional[str] = None
    paymentMethod: Optional[str] = None
    workerEarnings: Optional[float] = None
    coopFee: Optional[float] = None
    communityFund: Optional[float] = None
    created_at: Optional[datetime] = None
    invoice: Optional[InvoiceOut] = None
    payment: Optional[PaymentOut] = None

    model_config = ConfigDict(from_attributes=True)

# --- PAYMENT SCHEMAS ---
class PaymentCreateRequest(BaseModel):
    booking_id: int
    payment_method: str = "Co-op Wallet Pay"
    amount: Optional[float] = None

class PaymentVerifyRequest(BaseModel):
    booking_id: int
    transaction_reference: str

# --- RATING SCHEMAS ---
class RatingCreateRequest(BaseModel):
    booking_id: int
    rating: float = Field(..., ge=1.0, le=5.0)
    review: Optional[str] = ""

class RatingOut(BaseModel):
    id: int
    booking_id: int
    customer_id: int
    worker_id: int
    rating: float
    review: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- NOTIFICATION SCHEMAS ---
class NotificationOut(BaseModel):
    id: str
    role: str
    title: str
    message: str
    time: str
    read: bool
    type: str

# --- ADMIN & STATS SCHEMAS ---
class TopServiceStat(BaseModel):
    name: str
    count: int
    percentage: int

class DemandByAreaStat(BaseModel):
    zone: str
    requests: int
    activeWorkers: int

class CoopStatsOut(BaseModel):
    totalWorkers: int
    verifiedWorkers: int
    activeJobs: int
    completedJobs: int
    pendingJobs: int
    workerUtilization: float
    totalRequests: int
    revenue: float
    workerEarnings: float
    averageRating: float
    topServices: List[TopServiceStat]
    demandByArea: List[DemandByAreaStat]

class DemandForecastOut(BaseModel):
    id: str
    date: str
    dayOfWeek: str
    serviceType: str
    zone: str
    requests: int
    weather: str
    holiday: bool
    trendPercent: int
    predictionText: str
    isDemo: bool = True

class WorkforceRecommendationOut(BaseModel):
    zone: str
    service: str
    predictedDemand: int
    availableSupply: int
    gap: int
    recommendation: str
    priority: str

# --- CHAT SCHEMAS ---
class ChatMessageRequest(BaseModel):
    message: str
    language: Optional[str] = "en"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    service: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class ChatActionPayload(BaseModel):
    action_type: str  # 'worker_recommendation', 'booking_status', 'emergency_alert', 'worker_stats', 'admin_analytics', 'booking_confirmed', 'services_list'
    data: Dict[str, Any] = Field(default_factory=dict)

class ChatMessageOut(BaseModel):
    id: Optional[int] = None
    sender: str  # 'user', 'assistant', 'system'
    message: str
    timestamp: Optional[datetime] = None
    intent: Optional[str] = None
    language: Optional[str] = "en"
    action: Optional[ChatActionPayload] = None
    suggested_actions: List[str] = []

class ChatHistoryOut(BaseModel):
    session_id: int
    messages: List[ChatMessageOut] = []
