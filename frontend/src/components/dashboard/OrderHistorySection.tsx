import { useEffect, useState } from 'react';
import { apiGetOrders } from '../../lib/api';
import OrderDetailsModal from '../OrderDetailsModal';
import { Pagination } from '../Pagination';

const getStatusColor = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (s.includes('deliver')) return 'bg-green-100 text-green-800';
  if (s.includes('ship')) return 'bg-blue-100 text-blue-800';
  if (s.includes('process') || s.includes('pending')) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-800';
};

const ITEMS_PER_PAGE = 5;

const OrderHistorySection = () => {
  const [orders, setOrders] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiGetOrders();
        if (mounted) setOrders(res?.orders || []);
      } catch (err: any) {
        console.error('Failed to fetch orders', err);
        if (mounted) {
          setOrders([]);
          setError('Failed to load orders');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchOrders();
    return () => { mounted = false };
  }, []);

  // Pagination logic
  const totalItems = orders?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrders = orders?.slice(startIndex, endIndex) || [];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 sm:p-6 lg:p-8">
        <h2 className="text-xl sm:text-2xl font-light tracking-widest border-b border-gray-200 pb-4">
          Order History
        </h2>
        <div className="space-y-4 sm:space-y-6 mt-6">
          {loading ? (
            <p className="text-center text-foreground py-8">Loading orders…</p>
          ) : error ? (
            <p className="text-center text-red-600 py-8">{error}</p>
          ) : (paginatedOrders && paginatedOrders.length > 0 ? paginatedOrders.map((order: any) => {
            const orderId = order.order_id ?? order.id ?? '—';
            const orderDate = order.created_at || order.date || order.placed_at || '—';
            const orderStatus = order.status || order.state || 'Processing';
            const orderTotal = Number(order.total ?? order.amount ?? 0).toFixed(2);
            const orderItems = order.items || order.order_items || [];

            return (
              <div key={orderId} className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-base sm:text-lg text-dark-text">Order #{orderId}</h3>
                    <p className="text-xs sm:text-sm text-foreground mt-1">Date: {orderDate}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap ${getStatusColor(orderStatus)}`}>
                      {orderStatus}
                    </span>
                    <p className="font-sans text-base sm:text-lg font-semibold text-heading whitespace-nowrap">₹{orderTotal}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 border-t border-gray-200 pt-4">
                  <div className="flex -space-x-2 sm:-space-x-4">
                    {orderItems.slice(0, 3).map((item: any, index: number) => (
                      <img
                        key={index}
                        src={item.imageUrl || item.image_url || item.media?.[0]?.src || '/placeholder.png'}
                        alt={item.name || item.product_name}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-full border-2 border-white shadow-sm"
                      />
                    ))}
                    {orderItems.length > 3 && (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs sm:text-sm font-semibold text-gray-600">
                        +{orderItems.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 self-center">
                    <p className="font-semibold text-sm sm:text-base text-dark-text line-clamp-2">
                      {orderItems.map((i: any) => `${i.name ?? i.product_name ?? 'Product'} (x${i.quantity ?? i.qty ?? 1})`).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="text-right mt-4">
                  <button 
                    onClick={() => setSelectedOrderId(orderId)}
                    className="text-sm sm:text-base text-heading font-bold hover:underline transition-all"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-12">
              <p className="text-foreground text-lg mb-2">No orders yet</p>
              <p className="text-sm text-gray-500">Your order history will appear here</p>
            </div>
          ))}
        </div>

        {!loading && !error && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={totalItems}
          />
        )}

        <OrderDetailsModal
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          orderId={selectedOrderId || 0}
        />
      </div>
    </div>
  );
};

export default OrderHistorySection;
