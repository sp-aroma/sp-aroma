from fastapi import APIRouter, Depends, HTTPException, status
from apps.orders.services import OrderService
from apps.accounts.dependencies import get_current_user, require_superuser
from pydantic import BaseModel

router = APIRouter(prefix="/orders", tags=["Orders"])


class OrderStatusUpdate(BaseModel):
    status: str


@router.get("/")
def list_my_orders(user=Depends(get_current_user)):
    return OrderService.get_user_orders(user.id)


@router.get("/{order_id}")
def get_my_order(order_id: int, user=Depends(get_current_user)):
    return OrderService.get_user_order(user.id, order_id)


@router.patch("/{order_id}/status")
def update_order_status(order_id: int, payload: OrderStatusUpdate, user=Depends(get_current_user)):
    """Allow users to update their order status (for cancellation requests)"""
    return OrderService.update_order_status(user.id, order_id, payload.status, is_user=True)


@router.get("/admin/allorders")
def get_all_orders(admin=Depends(require_superuser)):
    return OrderService.get_all_success_orders()


@router.get("/admin/analytics")
def get_analytics(admin=Depends(require_superuser)):
    """Get comprehensive analytics for admin dashboard"""
    return OrderService.get_analytics()


@router.get("/admin/{order_id}")
def get_order_by_admin(order_id: int, admin=Depends(require_superuser)):
    """Admin can view any order details"""
    return OrderService.get_order_by_id(order_id)


@router.patch("/admin/{order_id}/status")
def admin_update_order_status(order_id: int, payload: OrderStatusUpdate, admin=Depends(require_superuser)):
    """Admin can update any order status"""
    return OrderService.update_order_status(None, order_id, payload.status, is_user=False)
