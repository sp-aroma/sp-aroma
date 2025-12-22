# apps/cart/schemas.py

from typing import List, Optional
from pydantic import BaseModel


class AddToCartIn(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = 1


class UpdateCartItemIn(BaseModel):
    quantity: int


class CartItemOut(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int]
    quantity: int
    price: float
    subtotal: float


class CartOut(BaseModel):
    items: List[CartItemOut]
    total_amount: float
    currency: str = "INR"
