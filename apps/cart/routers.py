# apps/cart/routers.py

from fastapi import APIRouter, Depends
from apps.accounts.dependencies import get_current_user
from apps.cart.schemas import (
    AddToCartIn,
    UpdateCartItemIn,
    CartOut
)
from apps.cart.services import CartService

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.post("/add", response_model=CartOut)
def add_to_cart(payload: AddToCartIn, user=Depends(get_current_user)):
    return CartService.add_item(user.id, payload.dict())


@router.get("/", response_model=CartOut)
def get_cart(user=Depends(get_current_user)):
    return CartService.get_cart(user.id)


@router.put("/item/{item_id}", response_model=CartOut)
def update_cart_item(item_id: int, payload: UpdateCartItemIn, user=Depends(get_current_user)):
    return CartService.update_item(user.id, item_id, payload.quantity)


@router.delete("/item/{item_id}", response_model=CartOut)
def delete_cart_item(item_id: int, user=Depends(get_current_user)):
    return CartService.delete_item(user.id, item_id)


@router.post("/checkout")
def checkout(address_id: int, user=Depends(get_current_user)):
    return CartService.checkout(user.id, address_id)
