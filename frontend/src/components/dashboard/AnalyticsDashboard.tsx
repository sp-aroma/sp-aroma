import { useEffect, useState } from 'react';
import { apiGetOrderAnalytics, apiGetAdminAnalytics } from '../../lib/api';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  Package,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#FFE4B5'];

interface AnalyticsData {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  recent_orders_7days: number;
  status_breakdown: Record<string, number>;
  top_products: Array<{
    product_id: number;
    total_quantity: number;
    total_revenue: number;
  }>;
  monthly_revenue: Array<{
    year: number;
    month: number;
    revenue: number;
  }>;
}

interface UserAnalytics {
  total_users: number;
  active_users: number;
  verified_users: number;
  inactive_users: number;
  unverified_users: number;
}

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try{
      const [orderData, userData] = await Promise.all([
        apiGetOrderAnalytics(),
        apiGetAdminAnalytics(),
      ]);
      setAnalytics(orderData);
      setUserAnalytics(userData);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md">
        <p className="text-center text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics || !userAnalytics) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md">
        <p className="text-center text-red-600">Failed to load analytics</p>
      </div>
    );
  }

  const statusData = Object.entries(analytics.status_breakdown).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
  }));

  const monthlyData = analytics.monthly_revenue.map((item) => ({
    month: `${item.month}/${item.year}`,
    revenue: item.revenue,
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<DollarSign className="w-8 h-8 text-green-600" />}
          title="Total Revenue"
          value={`₹${analytics.total_revenue.toFixed(2)}`}
          subtitle="All time"
          bgColor="bg-green-50"
        />
        <MetricCard
          icon={<ShoppingCart className="w-8 h-8 text-blue-600" />}
          title="Total Orders"
          value={analytics.total_orders.toString()}
          subtitle={`${analytics.recent_orders_7days} in last 7 days`}
          bgColor="bg-blue-50"
        />
        <MetricCard
          icon={<TrendingUp className="w-8 h-8 text-purple-600" />}
          title="Avg Order Value"
          value={`₹${analytics.avg_order_value.toFixed(2)}`}
          subtitle="Per order"
          bgColor="bg-purple-50"
        />
        <MetricCard
          icon={<Users className="w-8 h-8 text-orange-600" />}
          title="Total Users"
          value={userAnalytics.total_users.toString()}
          subtitle={`${userAnalytics.active_users} active`}
          bgColor="bg-orange-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-light tracking-widest mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8B4513" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-light tracking-widest mb-4">Order Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-light tracking-widest mb-4">Top Selling Products</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.top_products.slice(0, 5)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="product_id" />
            <YAxis yAxisId="left" orientation="left" stroke="#8B4513" />
            <YAxis yAxisId="right" orientation="right" stroke="#CD853F" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="total_quantity" fill="#8B4513" name="Quantity Sold" />
            <Bar yAxisId="right" dataKey="total_revenue" fill="#CD853F" name="Revenue (₹)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Active Users"
          value={userAnalytics.active_users}
          color="text-green-600"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Verified"
          value={userAnalytics.verified_users}
          color="text-blue-600"
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          title="Inactive"
          value={userAnalytics.inactive_users}
          color="text-gray-600"
        />
        <StatCard
          icon={<Package className="w-6 h-6" />}
          title="Unverified"
          value={userAnalytics.unverified_users}
          color="text-orange-600"
        />
      </div>
    </div>
  );
};

const MetricCard = ({
  icon,
  title,
  value,
  subtitle,
  bgColor,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  bgColor: string;
}) => (
  <div className={`${bgColor} p-6 rounded-lg`}>
    <div className="flex items-center justify-between mb-4">
      {icon}
    </div>
    <h4 className="text-sm font-medium text-gray-600 mb-1">{title}</h4>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
  </div>
);

const StatCard = ({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  color: string;
}) => (
  <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-heading">
    <div className="flex items-center gap-4">
      <div className={`${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  </div>
);

export default AnalyticsDashboard;
