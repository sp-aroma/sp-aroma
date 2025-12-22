from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Numeric,
    String,
    DateTime
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from config.database import FastModel


class Order(FastModel):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, nullable=False)
    address_id = Column(Integer, nullable=False)
    currency = Column(String, default="INR", nullable=False)
    currency = Column(String, default="INR", nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(
        String,
        default="created"
    )
    # created | paid | failed | cancelled | shipped | delivered

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan"
    )


class OrderItem(FastModel):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)

    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, nullable=False)
    variant_id = Column(Integer, nullable=True)

    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
