from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import FastModel

class Payment(FastModel):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    razorpay_order_id = Column(String, nullable=False)
    razorpay_payment_id = Column(String, nullable=True)

    amount = Column(Numeric(10, 2))
    status = Column(String, default="created")

    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    order = relationship("Order", back_populates="payments")
