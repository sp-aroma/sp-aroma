# apps/cart/services.py

from fastapi import HTTPException
from sqlalchemy.orm import Session

from config.database import SessionLocal
from apps.cart.models import Cart, CartItem
from apps.products.models import Product, ProductVariant
from apps.orders.services import OrderService


class CartService:
    """
    Cart persistence + checkout
    """

    # ------------------------
    # Helpers
    # ------------------------

    @staticmethod
    def _get_or_create_cart(session: Session, user_id: int) -> Cart:
        cart = session.query(Cart).filter_by(user_id=user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            session.add(cart)
            session.flush()
        return cart

    @staticmethod
    def _serialize_cart(cart: Cart):
        items = []
        total = 0

        for item in cart.items:
            if item.variant_id:
                price = float(item.variant.price)
            else:
                price = float(item.product.price)

            subtotal = price * item.quantity
            total += subtotal

            items.append({
                "id": item.id,
                "product_id": item.product_id,
                "variant_id": item.variant_id,
                "quantity": item.quantity,
                "price": price,
                "subtotal": subtotal,
            })

        return {
            "items": items,
            "total_amount": total,
            "currency": "INR",
        }

    # ------------------------
    # APIs
    # ------------------------

    @classmethod
    def add_item(cls, user_id: int, payload: dict):
        session = SessionLocal()
        try:
            product_id = payload["product_id"]
            variant_id = payload.get("variant_id")
            quantity = payload.get("quantity", 1)

            if quantity <= 0:
                raise HTTPException(400, "Quantity must be >= 1")

            product = session.get(Product, product_id)
            if not product:
                raise HTTPException(404, "Product not found")

            if variant_id:
                variant = session.get(ProductVariant, variant_id)
                if not variant:
                    raise HTTPException(400, "Invalid variant_id")

            cart = cls._get_or_create_cart(session, user_id)

            item = session.query(CartItem).filter_by(
                cart_id=cart.id,
                product_id=product_id,
                variant_id=variant_id
            ).first()

            if item:
                item.quantity += quantity
            else:
                session.add(CartItem(
                    cart_id=cart.id,
                    product_id=product_id,
                    variant_id=variant_id,
                    quantity=quantity
                ))

            session.commit()
            session.refresh(cart)

            return cls._serialize_cart(cart)

        finally:
            session.close()

    @classmethod
    def get_cart(cls, user_id: int):
        session = SessionLocal()
        try:
            cart = session.query(Cart).filter_by(user_id=user_id).first()
            if not cart:
                return {"items": [], "total_amount": 0, "currency": "INR"}
            return cls._serialize_cart(cart)
        finally:
            session.close()

    @classmethod
    def update_item(cls, user_id: int, item_id: int, quantity: int):
        if quantity <= 0:
            raise HTTPException(400, "Quantity must be >= 1")

        session = SessionLocal()
        try:
            item = session.get(CartItem, item_id)
            if not item or item.cart.user_id != user_id:
                raise HTTPException(404, "Item not found")

            item.quantity = quantity
            session.commit()
            session.refresh(item.cart)

            return cls._serialize_cart(item.cart)
        finally:
            session.close()

    @classmethod
    def delete_item(cls, user_id: int, item_id: int):
        session = SessionLocal()
        try:
            item = session.get(CartItem, item_id)
            if not item or item.cart.user_id != user_id:
                raise HTTPException(404, "Item not found")

            cart = item.cart
            session.delete(item)
            session.commit()
            session.refresh(cart)

            return cls._serialize_cart(cart)
        finally:
            session.close()

    # ------------------------
    # Checkout
    # ------------------------

    @classmethod
    def checkout(cls, user_id: int, address_id: int):
        session: Session = SessionLocal()
        try:
            cart = session.query(Cart).filter_by(user_id=user_id).first()
            if not cart or not cart.items:
                raise HTTPException(status_code=400, detail="Cart is empty")

            order = OrderService.create_from_cart(
                session=session,
                user_id=user_id,
                address_id=address_id,
                cart=cart,
                mock_payment=True,
            )

            # Clear cart
            session.query(CartItem).filter_by(cart_id=cart.id).delete()

            # 🔥 SINGLE COMMIT POINT
            session.commit()

            return {
                "order_id": order.id,
                "status": order.status,
                "payment": "mock_success",
            }

        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
