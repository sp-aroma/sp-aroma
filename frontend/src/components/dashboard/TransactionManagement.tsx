import { useEffect, useState } from 'react';
import { apiGetAllPayments } from '../../lib/api';
import { Search } from 'lucide-react';

interface Payment {
  id: number;
  order_id: number;
  amount: number;
  status: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  created_at: string;
}

const TransactionManagement = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await apiGetAllPayments();
      setPayments(res?.payments || []);
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.id.toString().includes(searchTerm) ||
      payment.order_id.toString().includes(searchTerm) ||
      payment.razorpay_payment_id?.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || payment.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case 'SUCCESS':
      case 'CAPTURED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
      case 'CREATED':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalRevenue = filteredPayments
    .filter((p) => p.status.toUpperCase() === 'SUCCESS')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-200 pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-light tracking-widest">Transaction Management</h2>
          <p className="text-sm text-gray-600 mt-1">Total Revenue: ₹{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:border-heading focus:ring-1 focus:ring-heading"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-md focus:border-heading focus:ring-1 focus:ring-heading"
          >
            <option value="ALL">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="CREATED">Created</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Successful</p>
          <p className="text-2xl font-bold text-green-700">
            {payments.filter((p) => p.status.toUpperCase() === 'SUCCESS').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-700">
            {payments.filter((p) => p.status.toUpperCase() === 'PENDING').length}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Failed</p>
          <p className="text-2xl font-bold text-red-700">
            {payments.filter((p) => p.status.toUpperCase() === 'FAILED').length}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-blue-700">₹{totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-center py-8 text-gray-600">Loading transactions...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-600">
                <th className="pb-3 pr-4">Payment ID</th>
                <th className="pb-3 pr-4">Order ID</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Razorpay ID</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 pr-4">
                    <span className="font-medium text-gray-900">#{payment.id}</span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="text-gray-600">#{payment.order_id}</span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="font-medium text-heading">₹{Number(payment.amount).toFixed(2)}</span>
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        payment.status
                      )}`}
                    >
                      {payment.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="text-sm text-gray-600">
                      {payment.razorpay_payment_id || payment.razorpay_order_id || '—'}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className="text-sm text-gray-600">
                      {new Date(payment.created_at).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filteredPayments.length === 0 && (
        <p className="text-center py-8 text-gray-600">No transactions found</p>
      )}
    </div>
  );
};

export default TransactionManagement;
