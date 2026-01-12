import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Check, X } from 'lucide-react';
import { Address } from '../../types';
import { apiGetAddresses, apiCreateAddress, apiUpdateAddress, apiDeleteAddress } from '../../lib/api';
import { Pagination } from '../Pagination';

const ITEMS_PER_PAGE = 6;

const AddressesSection = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<Partial<Address>>({
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGetAddresses();
      setAddresses(res?.addresses || []);
    } catch (err: any) {
      console.error('Failed to load addresses', err);
      setError('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await apiUpdateAddress(editingId, formData);
      } else {
        await apiCreateAddress(formData);
      }
      setShowAddForm(false);
      setEditingId(null);
      setFormData({
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        is_default: false,
      });
      await loadAddresses();
    } catch (err: any) {
      console.error('Failed to save address', err);
      const errorMsg = err?.body?.detail || err?.message || 'Failed to save address';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  const handleEdit = (addr: Address) => {
    setEditingId(addr.address_id || null);
    setFormData({
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: addr.country,
      is_default: addr.is_default,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (addressId: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await apiDeleteAddress(addressId);
      await loadAddresses();
    } catch (err: any) {
      console.error('Failed to delete address', err);
      const errorMsg = err?.body?.detail || err?.message || 'Failed to delete address';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      is_default: false,
    });
    setError('');
  };

  // Pagination logic
  const totalItems = addresses.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAddresses = addresses.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-light tracking-widest">My Addresses</h2>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center gap-2 bg-heading text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors text-sm sm:text-base"
            >
              <Plus size={18} />
              <span>Add Address</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 sm:p-6 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-base sm:text-lg font-medium mb-4">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading text-sm sm:text-base"
                  placeholder="123 Main Street, Apt 4B"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                  placeholder="Maharashtra"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Postal Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                  placeholder="400001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Country *
                </label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                  placeholder="India"
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default || false}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-heading border-gray-300 rounded focus:ring-heading"
              />
              <label htmlFor="is_default" className="ml-2 text-sm text-foreground">
                Set as default address
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-heading text-white py-2.5 rounded-md hover:bg-opacity-90 transition-colors"
            >
              <Check size={18} />
              <span>{editingId ? 'Update' : 'Save'} Address</span>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-foreground py-2.5 rounded-md hover:bg-gray-300 transition-colors"
            >
              <X size={18} />
              <span>Cancel</span>
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-center text-foreground py-8">Loading addresses…</p>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-foreground text-lg mb-2">No addresses yet</p>
          <p className="text-sm text-gray-500">Click "Add Address" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedAddresses.map((addr) => (
            <div
              key={addr.address_id}
              className="border border-gray-200 rounded-lg p-4 sm:p-5 hover:border-heading hover:shadow-md transition-all relative"
            >
              {addr.is_default && (
                <span className="absolute top-3 right-3 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                  Default
                </span>
              )}
              <div className="mb-3 pr-16">
                <div className="font-medium text-sm sm:text-base text-dark-text line-clamp-2">{addr.street}</div>
                <div className="text-xs sm:text-sm text-foreground mt-1">
                  {addr.city}, {addr.state} {addr.postal_code}
                </div>
                <div className="text-xs sm:text-sm text-foreground">{addr.country}</div>
              </div>
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(addr)}
                  className="flex items-center gap-1 text-xs sm:text-sm text-heading hover:text-opacity-80 transition-colors"
                >
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => addr.address_id && handleDelete(addr.address_id)}
                  className="flex items-center gap-1 text-xs sm:text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
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
  );
};

export default AddressesSection;
