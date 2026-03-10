import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { apiCheckout, apiGetAddress, apiCreatePayment, apiVerifyPayment } from '../lib/api';
import { Lock, CheckCircle, Package} from 'lucide-react';

// Load Razorpay script dynamically
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const { error: showError } = useToast();

  const [addressId, setAddressId] = useState<number | null>(null);
  const [address, setAddress] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    const selectedAddressId = location.state?.addressId;
    if (!selectedAddressId) {
      showError('Please select a delivery address');
      navigate('/cart');
      return;
    }
    if (cartCount === 0) {
      navigate('/cart');
      return;
    }
    setAddressId(selectedAddressId);
    loadAddress(selectedAddressId);
    loadRazorpayScript(); // preload
  }, []);

  const loadAddress = async (addrId: number) => {
    try {
      const addr = await apiGetAddress(addrId);
      setAddress(addr);
    } catch (err) {
      showError('Failed to load delivery address');
      navigate('/cart');
    }
  };

  const handleMakePayment = async () => {
    if (!addressId) return;
    setIsProcessing(true);

    try {
      // Step 1: Create order on backend (deducts stock, clears cart)
      const orderResult = await apiCheckout(addressId);
      const appOrderId = orderResult.order_id;
      setOrderId(appOrderId);

      // Step 2: Create Razorpay order
      const paymentData = await apiCreatePayment(appOrderId);

      // Step 3: Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showError('Failed to load payment gateway. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Step 4: Open Razorpay checkout
      const options = {
        key: paymentData.key_id,
        amount: paymentData.amount,
        currency: paymentData.currency || 'INR',
        name: 'SP Aroma',
        description: `Order #${appOrderId}`,
        order_id: paymentData.razorpay_order_id,
        prefill: {
          name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          email: user?.email || '',
          contact: address?.phone || '',
        },
        theme: { color: '#6B5B45' },
        handler: async (response: any) => {
          // Step 5: Verify payment on backend
          try {
            await apiVerifyPayment({
              order_id: appOrderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            clearCart();
            setPaymentSuccess(true);
          } catch (err: any) {
            showError('Payment verification failed. Contact support with Order #' + appOrderId);
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            showError('Payment cancelled. Your order is reserved — complete payment to confirm.');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      const errorMsg = err?.body?.detail || err?.message || 'Failed to initiate payment.';
      showError(errorMsg);
      setIsProcessing(false);
    }
  };

  const handleViewOrders = () => {
    navigate('/dashboard', { state: { tab: 'orders' } });
  };

  if (paymentSuccess) {
    return (
      <main className="pt-32 pb-24 bg-primary-bg min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto bg-white p-8 sm:p-12 rounded-lg shadow-lg text-center"
          >
            <div className="mb-6">
              <CheckCircle className="mx-auto text-green-500" size={80} />
            </div>
            <h1 className="text-3xl md:text-4xl font-light tracking-widest mb-4">
              Order Placed Successfully!
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Thank you for your purchase, {user?.first_name || 'valued customer'}!
            </p>
            <p className="text-gray-600 mb-8">
              Order ID: <span className="font-semibold">#{orderId}</span>
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <Package className="mx-auto text-green-600 mb-3" size={40} />
              <p className="text-green-800 font-medium mb-2">Your order has been confirmed</p>
              <p className="text-green-700 text-sm">
                You will receive an email confirmation shortly with order details and tracking information.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleViewOrders}
                className="w-full bg-heading text-white font-sans uppercase text-lg tracking-wider py-3.5 rounded-md hover:bg-opacity-90 transition-colors"
              >
                View My Orders
              </button>
              <button
                onClick={() => navigate('/products')}
                className="w-full border-2 border-heading text-heading font-sans uppercase text-lg tracking-wider py-3.5 rounded-md hover:bg-heading hover:text-white transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-32 pb-24 bg-primary-bg min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-light tracking-widest text-center mb-12">Checkout</h1>

        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-light tracking-widest border-b border-gray-200 pb-4 mb-6">
              Order Summary
            </h2>
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-b-0">
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    {(item as any).variantName && (
                      <p className="text-xs text-heading">{(item as any).variantName}</p>
                    )}
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-sans text-heading">
                      ₹{(parseFloat(item.price.replace('₹', '')) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cartCount} items)</span>
                <span className="font-sans">₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-sans text-green-600">FREE</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-dark-text border-t border-gray-200 pt-3">
                <span>Total</span>
                <span className="font-sans">₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>
            {address && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">Delivery Address</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">{address.full_name}</p>
                  <p className="text-sm text-gray-600 mt-1">{address.phone}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {address.line1}{address.line2 && `, ${address.line2}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  <p className="text-sm text-gray-600">{address.country}</p>
                </div>
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md h-fit">
            <h2 className="text-2xl font-light tracking-widest border-b border-gray-200 pb-4 mb-6">
              Payment
            </h2>

            {/* Razorpay branding */}
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="text-blue-600" size={20} />
                  <span className="font-medium text-blue-900">Secure Payment via Razorpay</span>
                </div>
                <p className="text-sm text-blue-800">
                  Pay securely using UPI, Cards, Net Banking, or Wallets.
                </p>
              </div>

              {/* Payment methods icons */}
              <div className="border border-gray-200 rounded-xl p-5 mb-4">
                <p className="text-sm text-gray-500 mb-3 text-center">Accepted Payment Methods</p>
                <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-600">
                  {['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallets'].map(m => (
                    <span key={m} className="bg-gray-100 px-3 py-1 rounded-full">{m}</span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleMakePayment}
              disabled={isProcessing || !address}
              className="w-full bg-heading text-white font-sans uppercase text-lg tracking-wider py-4 rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Opening Payment...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Pay ₹{cartTotal.toFixed(2)}
                </>
              )}
            </button>

            <p className="text-xs text-center text-gray-500 mt-4">
              By completing this purchase, you agree to our Terms & Conditions
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CheckoutPage;