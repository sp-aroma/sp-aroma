import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiGetOrder, apiGetAdminOrder } from '../lib/api';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | string;
  isAdmin?: boolean;
}

const getStatusColor = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (s.includes('deliver')) return 'bg-green-100 text-green-800';
  if (s.includes('ship')) return 'bg-blue-100 text-blue-800';
  if (s.includes('process') || s.includes('pending')) return 'bg-yellow-100 text-yellow-800';
  if (s.includes('cancel')) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

const OrderDetailsModal = ({ isOpen, onClose, orderId, isAdmin = false }: OrderDetailsModalProps) => {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrder();
    }
  }, [isOpen, orderId]);

  const loadOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const res = isAdmin 
        ? await apiGetAdminOrder(Number(orderId))
        : await apiGetOrder(Number(orderId));
      setOrder(res?.order || res);
    } catch (err: any) {
      console.error('Failed to load order', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const orderInfo = order?.order || order;
  const orderIdDisplay = orderInfo?.order_id ?? orderInfo?.id ?? orderId;
  const orderDate = orderInfo?.created_at || orderInfo?.date || orderInfo?.placed_at || '—';
  const orderStatus = orderInfo?.status || orderInfo?.state || 'Processing';
  const orderTotal = Number(orderInfo?.total_amount ?? orderInfo?.total ?? orderInfo?.amount ?? 0);
  const orderItems = orderInfo?.items || orderInfo?.order_items || [];
  const shippingAddress = orderInfo?.shipping_address || orderInfo?.address;
  const paymentInfo = orderInfo?.payment;
  const paymentMethod = paymentInfo?.razorpay_payment_id 
    ? `Razorpay (${paymentInfo.razorpay_payment_id.substring(0, 20)}...)`
    : paymentInfo?.status === 'completed' 
    ? 'Completed' 
    : '—';
  const userInfo = orderInfo?.user;
  const currency = orderInfo?.currency || '₹';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-light tracking-widest">Order Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <p className="text-center py-8">Loading order details…</p>
          ) : error ? (
            <p className="text-center text-red-600 py-8">{error}</p>
          ) : !order ? (
            <p className="text-center text-gray-600 py-8">No order details available</p>
          ) : (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-dark-text">Order #{orderIdDisplay}</h3>
                  <p className="text-sm text-foreground mt-1">
                    Placed on: {new Date(orderDate).toLocaleString()}
                  </p>
                  {userInfo && (
                    <div className="mt-3 text-sm">
                      <p className="text-foreground">
                        <span className="font-medium">Customer:</span> {userInfo.first_name} {userInfo.last_name}
                      </p>
                      <p className="text-foreground">
                        <span className="font-medium">Email:</span> {userInfo.email}
                      </p>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                      orderStatus
                    )}`}
                  >
                    {orderStatus}
                  </span>
                  <p className="font-sans text-2xl font-bold text-heading mt-2">
                    {currency}{orderTotal.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-lg font-medium text-dark-text mb-4">Items</h4>
                <div className="space-y-4">
                  {orderItems.map((item: any, index: number) => {
                    const itemName = item.product_name || item.name || 'Product';
                    const itemQty = item.quantity ?? item.qty ?? 1;
                    const itemPrice = Number(item.price ?? item.unit_price ?? 0);
                    const itemSubtotal = Number(item.subtotal ?? (itemPrice * itemQty));
                    const itemImage =
                      item.imageUrl || item.image_url || item.media?.[0]?.src || '/placeholder.png';

                    return (
                      <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <img
                          src={itemImage}
                          alt={itemName}
                          className="w-20 h-20 object-cover rounded-md"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.png';
                          }}
                        />
                        <div className="flex-1">
                          <h5 className="font-medium text-dark-text">{itemName}</h5>
                          <p className="text-sm text-foreground mt-1">Quantity: {itemQty}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-sans font-medium text-heading">
                            {currency}{itemPrice.toFixed(2)} each
                          </p>
                          <p className="text-sm text-foreground mt-1">
                            Total: {currency}{itemSubtotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shipping Address */}
              {shippingAddress && (
                <div>
                  <h4 className="text-lg font-medium text-dark-text mb-3">Shipping Address</h4>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-foreground">{shippingAddress.street || shippingAddress.line1}</p>
                    <p className="text-foreground">
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
                    </p>
                    <p className="text-foreground">{shippingAddress.country}</p>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div>
                  <h4 className="text-sm font-medium text-foreground">Payment Method</h4>
                  <p className="text-dark-text mt-1">{paymentMethod}</p>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-medium text-foreground">Order Total</h4>
                  <p className="font-sans text-xl font-bold text-heading mt-1">
                    {currency}{orderTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
