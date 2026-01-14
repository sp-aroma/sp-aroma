import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { apiGetCurrentUser, apiGetOrders, apiUpdateCurrentUser, apiDeleteAccount, apiGetAddresses, apiCreateAddress, apiUpdateAddress, apiDeleteAddress } from '../lib/api';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { User, Package, MapPin, ShieldCheck, Edit2, Eye, Trash2, Save, X, Plus } from 'lucide-react';

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

const UserDashboardPage = () => {
  const { user, logout } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses'>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Address state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState({
    full_name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    is_default: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Check if there's a tab specified in navigation state
    const targetTab = location.state?.tab;
    if (targetTab && ['profile', 'orders', 'addresses'].includes(targetTab)) {
      setActiveTab(targetTab);
    }
    
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, ordersRes, addressesRes] = await Promise.all([
        apiGetCurrentUser(),
        apiGetOrders(),
        apiGetAddresses(),
      ]);
      setProfile(profileRes);
      setOrders(ordersRes?.orders || []);
      setAddresses(addressesRes?.addresses || []);
      setEditForm({
        first_name: profileRes?.user?.first_name || '',
        last_name: profileRes?.user?.last_name || '',
      });
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditForm({
      first_name: profile?.user?.first_name || '',
      last_name: profile?.user?.last_name || '',
    });
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await apiUpdateCurrentUser(editForm);
      await loadData();
      setIsEditingProfile(false);
      showSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile', err);
      showError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      await apiDeleteAccount();
      showSuccess('Account deleted successfully');
      logout();
      navigate('/');
    } catch (err) {
      console.error('Failed to delete account', err);
      showError('Failed to delete account. Please try again.');
    }
  };

  // Address Management Functions
  const handleAddAddress = () => {
    setIsAddingAddress(true);
    setAddressForm({
      full_name: profile?.user?.first_name && profile?.user?.last_name 
        ? `${profile.user.first_name} ${profile.user.last_name}` 
        : '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      is_default: addresses.length === 0,
    });
  };

  const handleEditAddress = (address: any) => {
    setEditingAddressId(address.id);
    setAddressForm({
      full_name: address.full_name || '',
      phone: address.phone || '',
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
      country: address.country || 'India',
      is_default: address.is_default || false,
    });
  };

  const handleCancelAddressEdit = () => {
    setIsAddingAddress(false);
    setEditingAddressId(null);
    setAddressForm({
      full_name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      is_default: false,
    });
  };

  const handleSaveAddress = async () => {
    setIsSaving(true);
    try {
      if (editingAddressId) {
        await apiUpdateAddress(editingAddressId, addressForm);
      } else {
        await apiCreateAddress(addressForm);
      }
      const addressesRes = await apiGetAddresses();
      setAddresses(addressesRes?.addresses || []);
      handleCancelAddressEdit();
      showSuccess(editingAddressId ? 'Address updated successfully!' : 'Address added successfully!');
    } catch (err) {
      console.error('Failed to save address', err);
      showError('Failed to save address. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    const confirmed = await confirm({ 
      message: 'Are you sure you want to delete this address?',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    
    try {
      await apiDeleteAddress(addressId);
      const addressesRes = await apiGetAddresses();
      setAddresses(addressesRes?.addresses || []);
      showSuccess('Address deleted successfully!');
    } catch (err) {
      console.error('Failed to delete address', err);
      showError('Failed to delete address. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    const found = ORDER_STATUSES.find(st => st.value === s);
    return found?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const s = (status || '').toUpperCase();
    const found = ORDER_STATUSES.find(st => st.value === s);
    return found?.label || status;
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'orders' as const, label: 'My Orders', icon: Package },
    { id: 'addresses' as const, label: 'Addresses', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-light tracking-[0.2em] text-heading cursor-pointer" onClick={() => navigate('/')}>
                SP AROMA
              </h1>
              <p className="text-sm text-gray-600 mt-1">My Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              {(user?.is_admin || user?.is_superuser) && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded transition-colors"
                >
                  <ShieldCheck size={18} />
                  <span className="hidden sm:inline">Admin Panel</span>
                </button>
              )}
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-heading text-heading'
                      : 'border-transparent text-gray-600 hover:text-heading hover:border-gray-300'
                    }
                  `}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl font-light tracking-widest">Profile Information</h2>
                <div className="flex gap-2">
                  {!isEditingProfile ? (
                    <button
                      onClick={handleEditProfile}
                      className="flex items-center gap-2 px-4 py-2 text-heading border border-heading rounded hover:bg-heading hover:text-white transition-colors"
                    >
                      <Edit2 size={16} />
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <X size={16} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-heading text-white rounded hover:bg-heading/90 transition-colors disabled:opacity-50"
                      >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {loading ? (
                <p className="text-center py-8 text-gray-600">Loading profile...</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={editForm.first_name}
                          onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-heading"
                          placeholder="Enter first name"
                        />
                      ) : (
                        <p className="text-gray-900 text-lg">{profile?.user?.first_name || '—'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={editForm.last_name}
                          onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-heading"
                          placeholder="Enter last name"
                        />
                      ) : (
                        <p className="text-gray-900 text-lg">{profile?.user?.last_name || '—'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <p className="text-gray-900 text-lg">{profile?.user?.email || user?.email || '—'}</p>
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed here</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm ${profile?.user?.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {profile?.user?.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Delete Account Section */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-red-700 mb-2">Danger Zone</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-300 rounded hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={16} />
                        Delete Account
                      </button>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded p-4">
                        <p className="text-red-800 font-medium mb-3">
                          Are you absolutely sure? This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteAccount}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          >
                            Yes, Delete My Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl font-light tracking-widest">My Orders</h2>
                <p className="text-sm text-gray-600">{orders.length} total orders</p>
              </div>
              {loading ? (
                <p className="text-center py-8 text-gray-600">Loading orders...</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
                  <button
                    onClick={() => navigate('/products')}
                    className="px-6 py-2 bg-heading text-white rounded hover:bg-heading/90 transition-colors"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const orderId = order.order_id ?? order.id ?? 0;
                    const orderDate = order.created_at || order.date || '—';
                    const orderTotal = Number(order.total_amount ?? order.total ?? order.amount ?? 0);
                    const orderStatus = (order.status || 'PLACED').toUpperCase();

                    return (
                      <div key={orderId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-medium text-heading">Order #{orderId}</h3>
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(orderStatus)}`}>
                                {getStatusLabel(orderStatus)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Placed on {new Date(orderDate).toLocaleDateString()} at {new Date(orderDate).toLocaleTimeString()}
                            </p>
                            <p className="text-lg font-medium text-heading">₹{orderTotal.toFixed(2)}</p>
                          </div>
                          <button
                            onClick={() => setSelectedOrderId(orderId)}
                            className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Eye size={16} />
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Addresses Tab */}
          {activeTab === 'addresses' && (
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl font-light tracking-widest">My Addresses</h2>
                {!isAddingAddress && !editingAddressId && (
                  <button
                    onClick={handleAddAddress}
                    className="flex items-center gap-2 px-4 py-2 bg-heading text-white rounded hover:bg-heading/90 transition-colors"
                  >
                    <Plus size={16} />
                    Add Address
                  </button>
                )}
              </div>

              {loading ? (
                <p className="text-center py-8 text-gray-600">Loading addresses...</p>
              ) : (
                <>
                  {/* Add/Edit Address Form */}
                  {(isAddingAddress || editingAddressId) && (
                    <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-medium mb-4">
                        {editingAddressId ? 'Edit Address' : 'Add New Address'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                          <input
                            type="text"
                            value={addressForm.full_name}
                            onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-heading"
                            placeholder="Enter full name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                          <input
                            type="tel"
                            value={addressForm.phone}
                            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-heading"
                            placeholder="Enter phone number"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                          <input
                            type="text"
                            value={addressForm.line1}
                            onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-heading"
                            placeholder="House no., Building name"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                          <input
                            type="text"
                            value={addressForm.line2}
                            onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-heading"
                            placeholder="Road name, Area, Colony"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                          <input
                            type="text"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-heading"
                            placeholder="Enter city"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                          <input
                            type="text"
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-heading"
                            placeholder="Enter state"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                          <input
                            type="text"
                            value={addressForm.pincode}
                            onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-heading"
                            placeholder="Enter pincode"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                          <input
                            type="text"
                            value={addressForm.country}
                            onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-heading"
                            placeholder="Enter country"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={addressForm.is_default}
                              onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                              className="w-4 h-4 text-heading border-gray-300 rounded focus:ring-heading"
                            />
                            <span className="text-sm text-gray-700">Set as default address</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={handleCancelAddressEdit}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveAddress}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 bg-heading text-white rounded hover:bg-heading/90 transition-colors disabled:opacity-50"
                        >
                          <Save size={16} />
                          {isSaving ? 'Saving...' : 'Save Address'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Address List */}
                  {addresses.length === 0 && !isAddingAddress ? (
                    <div className="text-center py-12">
                      <MapPin className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-gray-600 mb-4">No addresses saved yet.</p>
                      <button
                        onClick={handleAddAddress}
                        className="px-6 py-2 bg-heading text-white rounded hover:bg-heading/90 transition-colors"
                      >
                        Add Your First Address
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {addresses.map((address) => (
                        <div
                          key={address.id}
                          className={`border rounded-lg p-4 ${
                            address.is_default ? 'border-heading bg-heading/5' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium text-gray-900">{address.full_name}</h3>
                                {address.is_default && (
                                  <span className="px-2 py-1 bg-heading text-white text-xs rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 text-sm mb-1">{address.phone}</p>
                              <p className="text-gray-600 text-sm">
                                {address.line1}
                                {address.line2 && `, ${address.line2}`}
                              </p>
                              <p className="text-gray-600 text-sm">
                                {address.city}, {address.state} - {address.pincode}
                              </p>
                              <p className="text-gray-600 text-sm">{address.country}</p>
                            </div>
                            {!isAddingAddress && editingAddressId !== address.id && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditAddress(address)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit address"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAddress(address.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete address"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
      </main>

      <OrderDetailsModal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId || 0}
      />
    </div>
  );
};

export default UserDashboardPage;
