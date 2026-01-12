from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from config.database import get_db
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.payments.services.factory import get_payment_gateway
from apps.accounts.dependencies import get_current_user, require_superuser

router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)

@router.post("/create/{order_id}")
def create_payment(order_id: int, user=Depends(get_current_user)):
    order = Order.get_or_404(order_id)
    return PaymentService.create_payment(order)

@router.get("/admin/all")
def get_all_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
    admin=Depends(require_superuser)
):
    """Get all payments (admin only)"""
    payments = db.query(Payment).options(
        joinedload(Payment.order)
    ).offset(skip).limit(limit).all()
    
    return {
        "payments": [
            {
                "id": payment.id,
                "order_id": payment.order_id,
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment.razorpay_payment_id,
                "amount": float(payment.amount),
                "status": payment.status,
                "created_at": payment.created_at.isoformat() if payment.created_at else None
            }
            for payment in payments
        ],
        "total": db.query(Payment).count()
    }
