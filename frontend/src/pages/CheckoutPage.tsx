import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { apiCheckout, apiGetAddress } from '../lib/api';
import { CreditCard, Lock, CheckCircle, Package } from 'lucide-react';

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
    // Get address ID from navigation state
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
  }, []);

  const loadAddress = async (addrId: number) => {
    try {
      const addr = await apiGetAddress(addrId);
      setAddress(addr);
    } catch (err) {
      console.error('Failed to load address', err);
      showError('Failed to load delivery address');
      navigate('/cart');
    }
  };

  const handleMakePayment = async () => {
    if (!addressId) return;

    setIsProcessing(true);
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Place the order
      const result = await apiCheckout(addressId);
      console.log('Checkout result:', result);
      
      setOrderId(result.order_id);
      setPaymentSuccess(true);
      
      // Clear the cart after successful checkout
      clearCart();
    } catch (err: any) {
      console.error('Checkout failed', err);
      const errorMsg = err?.body?.detail || err?.message || 'Payment failed. Please try again.';
      showError('Payment error: ' + errorMsg);
    } finally {
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
              <p className="text-green-800 font-medium mb-2">
                Your order has been confirmed
              </p>
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
        <h1 className="text-4xl md:text-5xl font-light tracking-widest text-center mb-12">
          Checkout
        </h1>
        
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-light tracking-widest border-b border-gray-200 pb-4 mb-6">
              Order Summary
            </h2>
            
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-b-0">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-16 h-16 object-cover rounded" 
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-sans text-heading">₹{(parseFloat(item.price.replace('₹', '')) * item.quantity).toFixed(2)}</p>
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

            {/* Delivery Address */}
            {address && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">Delivery Address</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">{address.full_name}</p>
                  <p className="text-sm text-gray-600 mt-1">{address.phone}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {address.line1}
                    {address.line2 && `, ${address.line2}`}
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

            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="text-blue-600" size={20} />
                  <span className="font-medium text-blue-900">Secure Payment</span>
                </div>
                <p className="text-sm text-blue-800">
                  Your payment information is encrypted and secure
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white p-6 rounded-xl mb-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <CreditCard size={32} />
                  <span className="text-sm font-medium">MOCK PAYMENT</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm opacity-90">Test Card Number</p>
                  <p className="text-lg font-mono tracking-wider">•••• •••• •••• 4242</p>
                  <div className="flex justify-between text-sm">
                    <span>Exp: 12/28</span>
                    <span>CVV: •••</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Mock Payment Mode:</strong> This is a test environment.
                </p>
                <p className="text-xs text-yellow-700">
                  No real payment will be processed. Click "Make Payment" to simulate a successful transaction.
                </p>
              </div>
            </div>

            <button
              onClick={handleMakePayment}
              disabled={isProcessing || !address}
              className="w-full bg-heading text-white font-sans uppercase text-lg tracking-wider py-4 rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Make Payment (₹{cartTotal.toFixed(2)})
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
