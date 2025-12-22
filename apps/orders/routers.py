from fastapi import APIRouter, Depends
from apps.orders.services import OrderService
from apps.accounts.dependencies import get_current_user, require_superuser
router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("/")
def list_my_orders(user=Depends(get_current_user)):
    return OrderService.get_user_orders(user.id)


@router.get("/{order_id}")
def get_my_order(order_id: int, user=Depends(get_current_user)):
    return OrderService.get_user_order(user.id, order_id)


@router.get("/admin/allorders")
def get_all_orders(admin=Depends(require_superuser)):
    return OrderService.get_all_success_orders()
