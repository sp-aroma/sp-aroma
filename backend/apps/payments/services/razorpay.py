import hmac
import hashlib
import razorpay
from config.settings import AppConfig


class RazorpayGateway:
    def __init__(self):
        config = AppConfig.get_config()
        self.key_id = config.RAZORPAY_KEY_ID
        self.key_secret = config.RAZORPAY_KEY_SECRET
        self.client = razorpay.Client(auth=(self.key_id, self.key_secret))

    def create_payment(self, order):
        """Create a Razorpay order and return order details + key_id for frontend."""
        razorpay_order = self.client.order.create({
            "amount": int(float(order.total_amount) * 100),  # paise
            "currency": "INR",
            "receipt": f"order_{order.id}",
            "payment_capture": 1
        })
        return {
            "razorpay_order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "key_id": self.key_id,
        }

    def verify_payment(self, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
        """Verify payment signature from Razorpay."""
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        generated_signature = hmac.new(
            self.key_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(generated_signature, razorpay_signature)