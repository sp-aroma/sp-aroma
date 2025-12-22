from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.orm import Session

from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment
from config.database import SessionLocal

class OrderService:

    # ------------------------
    # USER
    # ------------------------

    @staticmethod
    def get_user_orders(user_id: int):
        with SessionLocal() as session:
            orders = (
                session.query(Order)
                .filter(Order.user_id == user_id)
                .order_by(Order.created_at.desc())
                .all()
            )

            return [OrderService._serialize(order) for order in orders]

    @staticmethod
    def get_user_order(user_id: int, order_id: int):
        with SessionLocal() as session:
            order = (
                session.query(Order)
                .filter(
                    Order.id == order_id,
                    Order.user_id == user_id
                )
                .first()
            )

            if not order:
                raise HTTPException(status_code=404, detail="Order not found")

            return OrderService._serialize(order)

    # ------------------------
    # ADMIN
    # ------------------------

    @staticmethod
    def get_all_success_orders():
        with SessionLocal() as session:
            orders = (
                session.query(Order)
                .filter(Order.status == "SUCCESS")
                .order_by(Order.created_at.desc())
                .all()
            )

            return [OrderService._serialize(order) for order in orders]

    # ------------------------
    # CART → ORDER
    # ------------------------

    @staticmethod
    def create_from_cart(
        session: Session,
        user_id: int,
        address_id: int,
        cart,
        mock_payment: bool = True,
    ):
        if not cart.items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        total_amount = Decimal("0.00")

        # 1️⃣ Create Order
        order = Order(
            user_id=user_id,
            address_id=address_id,
            status="SUCCESS" if mock_payment else "PENDING",
            total_amount=Decimal("0.00"),
        )
        session.add(order)
        session.flush()

        # 2️⃣ Order Items
        for item in cart.items:
            price = (
                item.variant.price
                if item.variant_id
                else item.product.price
            )

            subtotal = price * item.quantity
            total_amount += subtotal

            session.add(
                OrderItem(
                    order_id=order.id,
                    product_id=item.product_id,
                    variant_id=item.variant_id,
                    quantity=item.quantity,
                    price=price,
                )
            )

        order.total_amount = total_amount

        # 3️⃣ Payment (mock-safe)
        if mock_payment:
            session.add(
                Payment(
                    order_id=order.id,
                    amount=total_amount,
                    status="SUCCESS",
                )
            )

        session.commit()
        session.refresh(order)
        return order

    # ------------------------

    @staticmethod
    def _serialize(order: Order):
        return {
            "id": order.id,
            "total_amount": order.total_amount,
            "status": order.status,
            "created_at": order.created_at,
            "items": [
                {
                    "product_id": item.product_id,
                    "variant_id": item.variant_id,
                    "quantity": item.quantity,
                    "price": item.price,
                }
                for item in order.items
            ],
        }
