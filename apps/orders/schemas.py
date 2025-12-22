from pydantic import BaseModel
from typing import List
from decimal import Decimal
from datetime import datetime

class OrderItemOut(BaseModel):
    product_id: int
    variant_id: int | None
    quantity: int
    price: Decimal

class OrderOut(BaseModel):
    id: int
    total_amount: Decimal
    status: str
    created_at: datetime
    items: List[OrderItemOut]

class OrderListOut(BaseModel):
    orders: List[OrderOut]
