from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from config.database import get_db, SessionLocal
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.payments.services.razorpay import RazorpayGateway
from apps.accounts.dependencies import get_current_user, require_superuser

router = APIRouter(prefix="/payments", tags=["Payments"])


class VerifyPaymentIn(BaseModel):
    order_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/create/{order_id}")
def create_payment(order_id: int, user=Depends(get_current_user)):
    """Create a Razorpay order for the given app order_id."""
    with SessionLocal() as session:
        order = session.query(Order).filter(
            Order.id == order_id,
            Order.user_id == user.id
        ).first()

        if not order:
            raise HTTPException(404, "Order not found")

        gateway = RazorpayGateway()
        razorpay_data = gateway.create_payment(order)

        payment = Payment(
            order_id=order.id,
            razorpay_order_id=razorpay_data["razorpay_order_id"],
            amount=order.total_amount,
            status="created",
        )
        session.add(payment)
        session.commit()

        return {
            "razorpay_order_id": razorpay_data["razorpay_order_id"],
            "amount": razorpay_data["amount"],
            "currency": razorpay_data["currency"],
            "key_id": razorpay_data["key_id"],
            "order_id": order.id,
        }


@router.post("/verify")
def verify_payment(payload: VerifyPaymentIn, user=Depends(get_current_user)):
    """Verify Razorpay payment signature and mark order as confirmed."""
    with SessionLocal() as session:
        order = session.query(Order).filter(
            Order.id == payload.order_id,
            Order.user_id == user.id
        ).first()

        if not order:
            raise HTTPException(404, "Order not found")

        gateway = RazorpayGateway()
        is_valid = gateway.verify_payment(
            payload.razorpay_order_id,
            payload.razorpay_payment_id,
            payload.razorpay_signature,
        )

        if not is_valid:
            raise HTTPException(400, "Invalid payment signature")

        payment = session.query(Payment).filter(
            Payment.razorpay_order_id == payload.razorpay_order_id
        ).first()

        if payment:
            payment.razorpay_payment_id = payload.razorpay_payment_id
            payment.status = "completed"

        order.status = "CONFIRMED"
        session.commit()

        return {"success": True, "order_id": order.id, "status": "CONFIRMED"}


@router.get("/admin/all")
def get_all_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
    admin=Depends(require_superuser)
):
    payments = db.query(Payment).options(
        joinedload(Payment.order)
    ).offset(skip).limit(limit).all()

    return {
        "payments": [
            {
                "id": p.id,
                "order_id": p.order_id,
                "razorpay_order_id": p.razorpay_order_id,
                "razorpay_payment_id": p.razorpay_payment_id,
                "amount": float(p.amount),
                "status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in payments
        ],
        "total": db.query(Payment).count(),
    }