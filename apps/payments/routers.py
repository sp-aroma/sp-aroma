from fastapi import APIRouter, Depends
from apps.orders.models import Order
from apps.payments.services.factory import get_payment_gateway
from apps.accounts.dependencies import get_current_user

router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)

@router.post("/create/{order_id}")
def create_payment(order_id: int, user=Depends(get_current_user)):
    order = Order.get_or_404(order_id)
    return PaymentService.create_payment(order)
