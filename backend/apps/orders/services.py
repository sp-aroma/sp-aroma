from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.orm import Session

from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment
from config.database import SessionLocal

# Order Status Constants
VALID_ORDER_STATUSES = [
    "PLACED",
    "CONFIRMED", 
    "PROCESSING",
    "PACKING",
    "PACKED",
    "SHIPPED",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "CANCEL_REQUESTED",
    # Legacy statuses for backward compatibility
    "SUCCESS",
    "PENDING",
]

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

            serialized_orders = [OrderService._serialize_in_session(session, order) for order in orders]
            return {"orders": serialized_orders}

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

            return OrderService._serialize_in_session(session, order)

    # ------------------------
    # ADMIN
    # ------------------------

    @staticmethod
    def get_all_success_orders():
        """Get all orders for admin (not just SUCCESS status anymore)"""
        with SessionLocal() as session:
            orders = (
                session.query(Order)
                .order_by(Order.created_at.desc())
                .all()
            )

            # Serialize orders while still in session context
            serialized_orders = [OrderService._serialize_in_session(session, order) for order in orders]
            return {"orders": serialized_orders}

    @staticmethod
    def get_order_by_id(order_id: int):
        """Admin can view any order by ID"""
        with SessionLocal() as session:
            order = session.query(Order).filter(Order.id == order_id).first()
            
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            # Serialize while in session context
            return {"order": OrderService._serialize_in_session(session, order)}

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
            status="PLACED" if mock_payment else "PENDING",
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
                    status="completed",
                    razorpay_order_id=f"mock_order_{order.id}",
                    razorpay_payment_id=f"mock_payment_{order.id}",
                )
            )

        session.commit()
        session.refresh(order)
        return order

    # ------------------------

    @staticmethod
    def _serialize_in_session(session: Session, order: Order):
        """Serialize order with all relationships while in session context"""
        from apps.accounts.models import User
        from apps.products.models import Product, ProductVariant
        
        # Get user info
        user = session.query(User).filter(User.id == order.user_id).first()
        user_info = {
            "user_id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        } if user else None
        
        # Get payment info (access while in session)
        payment_info = None
        if order.payments:
            payment = order.payments[0]
            payment_info = {
                "payment_id": payment.id,
                "amount": float(payment.amount),
                "status": payment.status,
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment.razorpay_payment_id,
                "created_at": payment.created_at,
            }
        
        # Get items with product details
        items_with_details = []
        for item in order.items:
            product = session.query(Product).filter(Product.id == item.product_id).first()
            variant = session.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first() if item.variant_id else None
            
            items_with_details.append({
                "product_id": item.product_id,
                "product_name": product.product_name if product else "Unknown Product",
                "variant_id": item.variant_id,
                "quantity": item.quantity,
                "price": float(item.price),
                "subtotal": float(item.price * item.quantity),
            })
        
        return {
            "order_id": order.id,
            "id": order.id,
            "total_amount": float(order.total_amount),
            "status": order.status,
            "created_at": order.created_at,
            "user": user_info,
            "payment": payment_info,
            "items": items_with_details,
        }

    @staticmethod
    def _serialize(order: Order):
        """Legacy serialization - creates its own session"""
        with SessionLocal() as session:
            # Re-attach order to session or fetch fresh
            order = session.query(Order).filter(Order.id == order.id).first()
            if not order:
                return {}
            return OrderService._serialize_in_session(session, order)

    @staticmethod
    def update_order_status(user_id: int | None, order_id: int, new_status: str, is_user: bool = True):
        """Update order status - user can only cancel, admin can update to anything"""
        with SessionLocal() as session:
            query = session.query(Order).filter(Order.id == order_id)
            
            if is_user and user_id:
                query = query.filter(Order.user_id == user_id)
                # Users can only cancel or request cancellation
                if new_status.upper() not in ["CANCELLED", "CANCEL_REQUESTED"]:
                    raise HTTPException(status_code=403, detail="Users can only cancel orders")
            
            order = query.first()
            
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            # Validate status
            if new_status.upper() not in VALID_ORDER_STATUSES:
                raise HTTPException(status_code=400, detail=f"Invalid order status: {new_status}")
            
            order.status = new_status.upper()
            session.commit()
            session.refresh(order)
            
            return OrderService._serialize(order)

    @staticmethod
    def get_analytics():
        """Get comprehensive analytics for admin dashboard"""
        with SessionLocal() as session:
            from sqlalchemy import func
            from decimal import Decimal
            
            # Total orders
            total_orders = session.query(func.count(Order.id)).scalar() or 0
            
            # Orders by status
            orders_by_status = session.query(
                Order.status, 
                func.count(Order.id)
            ).group_by(Order.status).all()
            
            status_breakdown = {status: count for status, count in orders_by_status}
            
            # Total revenue - include all successful order statuses
            completed_statuses = ["SUCCESS", "PLACED", "CONFIRMED", "PROCESSING", "PACKING", "PACKED", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]
            total_revenue = session.query(
                func.sum(Order.total_amount)
            ).filter(Order.status.in_(completed_statuses)).scalar() or Decimal("0.00")
            
            # Average order value
            avg_order_value = session.query(
                func.avg(Order.total_amount)
            ).filter(Order.status.in_(completed_statuses)).scalar() or Decimal("0.00")
            
            # Recent orders (last 7 days)
            from datetime import datetime, timedelta
            week_ago = datetime.now() - timedelta(days=7)
            recent_orders = session.query(func.count(Order.id)).filter(
                Order.created_at >= week_ago
            ).scalar() or 0
            
            # Top selling products
            top_products = session.query(
                OrderItem.product_id,
                func.sum(OrderItem.quantity).label('total_quantity'),
                func.sum(OrderItem.price * OrderItem.quantity).label('total_revenue')
            ).group_by(OrderItem.product_id).order_by(
                func.sum(OrderItem.quantity).desc()
            ).limit(10).all()
            
            # Monthly revenue (last 12 months)
            monthly_revenue = session.query(
                func.extract('year', Order.created_at).label('year'),
                func.extract('month', Order.created_at).label('month'),
                func.sum(Order.total_amount).label('revenue')
            ).filter(
                Order.status.in_(completed_statuses),
                Order.created_at >= datetime.now() - timedelta(days=365)
            ).group_by('year', 'month').order_by('year', 'month').all()
            
            return {
                "total_orders": total_orders,
                "total_revenue": float(total_revenue),
                "avg_order_value": float(avg_order_value),
                "recent_orders_7days": recent_orders,
                "status_breakdown": status_breakdown,
                "top_products": [
                    {
                        "product_id": p[0],
                        "total_quantity": p[1],
                        "total_revenue": float(p[2])
                    } for p in top_products
                ],
                "monthly_revenue": [
                    {
                        "year": int(m[0]),
                        "month": int(m[1]),
                        "revenue": float(m[2])
                    } for m in monthly_revenue
                ]
            }
