from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.entities import Booking, Worker, Notification, Invoice, Payment

TRANSITIONS = {
    "REQUESTED": {"MATCHED", "CANCELLED", "REJECTED"}, "MATCHED": {"ACCEPTED", "CANCELLED", "REJECTED"},
    "ACCEPTED": {"ON_THE_WAY", "CANCELLED"}, "ON_THE_WAY": {"ARRIVED", "CANCELLED"},
    "ARRIVED": {"IN_PROGRESS", "CANCELLED"}, "IN_PROGRESS": {"COMPLETED"}, "COMPLETED": {"PAID"},
    "PAID": {"RATED"}, "RATED": set(), "CANCELLED": set(), "REJECTED": set(),
}

async def notify(db: AsyncSession, user_id: int, title: str, message: str, kind: str = "booking"):
    db.add(Notification(user_id=user_id, title=title, message=message, type=kind))

async def transition_booking(db: AsyncSession, booking: Booking, next_status: str) -> Booking:
    next_status = next_status.upper()
    if next_status not in TRANSITIONS.get(booking.status, set()):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Cannot transition booking from {booking.status} to {next_status}")
    booking.status = next_status; booking.updated_at = datetime.utcnow()
    worker = await db.get(Worker, booking.worker_id)
    if next_status == "ACCEPTED": worker.availability_status = "BUSY"
    elif next_status == "COMPLETED":
        worker.availability_status = "AVAILABLE"; worker.completed_jobs += 1
        subtotal = booking.total_amount
        booking.invoice = Invoice(booking_id=booking.id, invoice_number=f"DEMO-INV-{booking.id:06d}", subtotal=subtotal, tax=round(subtotal*.18, 2), total=round(subtotal*1.18, 2), worker_earnings=round(subtotal*.75, 2), coop_fee=round(subtotal*.20, 2), community_fund=round(subtotal*.05, 2))
    await notify(db, worker.user_id, f"Booking {next_status.lower().replace('_', ' ')}", f"Booking #{booking.id} is now {next_status}.")
    return booking
