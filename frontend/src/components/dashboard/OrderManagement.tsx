import { useEffect, useState } from 'react';
import { apiGetAllOrders, apiAdminUpdateOrderStatus } from '../../lib/api';
import { Search, Eye } from 'lucide-react';
import OrderDetailsModal from '../OrderDetailsModal';
import { Pagination } from '../Pagination';

const ORDER_STATUSES = [
  { value: 'PLACED', label: 'Order Placed', color: 'bg-blue-100 text-blue-800' },
  { value: 'CONFIRMED', label: 'Order Confirmed', color: 'bg-purple-100 text-purple-800' },
  { value: 'PROCESSING', label: 'Processing', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'PACKING', label: 'Packing', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'PACKED', label: 'Packed', color: 'bg-amber-100 text-amber-800' },
  { value: 'SHIPPED', label: 'Shipped', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'IN_TRANSIT', label: 'In Transit', color: 'bg-teal-100 text-teal-800' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', color: 'bg-lime-100 text-lime-800' },
  { value: 'DELIVERED', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'CANCEL_REQUESTED', label: 'Cancel Requested', color: 'bg-orange-100 text-orange-800' },
];

const ITEMS_PER_PAGE = 10;

const OrderManagement = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await apiGetAllOrders();
      setOrders(res?.orders || []);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    if (!confirm(`Change order #${orderId} status to ${newStatus}?`)) return;
    
    try {
      await apiAdminUpdateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (err: any) {
      console.error('Failed to update status', err);
      alert('Error: ' + (err?.body?.detail || 'Failed to update order status'));
    }
  };

  const filteredOrders = orders.filter((order) => {
    const orderId = order.order_id ?? order.id ?? '';
    const status = order.status || '';
    const matchesSearch = orderId.toString().includes(searchTerm);
    const matchesFilter = statusFilter === 'ALL' || status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    const found = ORDER_STATUSES.find(st => st.value === s);
    return found?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-light tracking-widest">Order Management</h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by order ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:border-heading focus:ring-1 focus:ring-heading text-sm sm:text-base"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-200 rounded-md focus:border-heading focus:ring-1 focus:ring-heading text-sm sm:text-base"
            >
              <option value="ALL">All Status</option>
              {ORDER_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-600">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-heading"></div>
            <p className="mt-2">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600 text-lg mb-2">No orders found</p>
            <p className="text-sm text-gray-500">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs sm:text-sm font-medium text-gray-600 bg-gray-50">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Change Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedOrders.map((order) => {
                  const orderId = order.order_id ?? order.id ?? 0;
                  const orderDate = order.created_at || order.date || '—';
                  const orderTotal = Number(order.total_amount ?? order.total ?? order.amount ?? 0);
                  const orderStatus = (order.status || 'PLACED').toUpperCase();

                  return (
                    <tr key={orderId} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 sm:py-4 px-4">
                        <span className="font-medium text-gray-900 text-sm sm:text-base">#{orderId}</span>
                      </td>
                      <td className="py-3 sm:py-4 px-4">
                        <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                          {new Date(orderDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 sm:py-4 px-4">
                        <span className="font-medium text-heading text-sm sm:text-base">₹{orderTotal.toFixed(2)}</span>
                      </td>
                      <td className="py-3 sm:py-4 px-4">
                        <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(orderStatus)}`}>
                          {orderStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 sm:py-4 px-4">
                        <select
                          value={orderStatus}
                          onChange={(e) => handleStatusChange(orderId, e.target.value)}
                          className="w-full sm:w-auto px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 sm:py-4 px-4">
                        <button
                          onClick={() => setSelectedOrderId(orderId)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View details"
                          aria-label="View order details"
                        >
                          <Eye size={16} className="sm:w-5 sm:h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>

        {!loading && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={totalItems}
          />
        )}
      </div>

      <OrderDetailsModal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId || 0}
        isAdmin={true}
      />
    </>
  );
};

export default OrderManagement;
