# apps/cart/models.py

from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from config.database import FastModel


class Cart(FastModel):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, unique=True)

    items = relationship(
        "CartItem",
        back_populates="cart",
        cascade="all, delete-orphan"
    )


class CartItem(FastModel):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True)

    cart_id = Column(Integer, ForeignKey("carts.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)

    quantity = Column(Integer, default=1)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")
    variant = relationship("ProductVariant")
