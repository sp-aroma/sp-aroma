import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Address } from '../types';
import { apiGetAddresses, apiCreateAddress } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (addressId: number) => void;
}

const AddressModal = ({ isOpen, onClose, onSelectAddress }: AddressModalProps) => {
  const { error: showError } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    full_name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });

  useEffect(() => {
    if (isOpen) {
      loadAddresses();
    }
  }, [isOpen]);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const res = await apiGetAddresses();
      setAddresses(res?.addresses || []);
    } catch (err) {
      console.error('Failed to load addresses', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCreateAddress(newAddress);
      setShowAddForm(false);
      setNewAddress({
        full_name: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      });
      await loadAddresses();
    } catch (err: any) {
      console.error('Failed to create address', err);
      showError('Failed to add address: ' + (err?.body?.detail || err?.message || 'Unknown error'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-light tracking-widest">Select Delivery Address</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <p className="text-center py-4">Loading addresses...</p>
          ) : (
            <>
              {addresses.length === 0 && !showAddForm && (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">You don't have any saved addresses yet.</p>
                  <p className="text-sm text-gray-500 mb-4">Add a delivery address to continue with checkout.</p>
                </div>
              )}

              {addresses.length > 0 && (
                <div className="space-y-4 mb-6">
                  <p className="text-sm text-gray-600 mb-3">Click on an address to select it for delivery</p>
                  {addresses.map((addr) => {
                    const addressId = addr.id || addr.address_id;
                    return (
                      <div
                        key={addressId}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:border-heading hover:bg-heading/5 cursor-pointer transition-all group"
                        onClick={() => {
                          if (addressId) {
                            onSelectAddress(addressId);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {addr.full_name || 'Address'}
                              {addr.is_default && (
                                <span className="ml-2 inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            {addr.phone && (
                              <div className="text-sm text-gray-600 mt-1">{addr.phone}</div>
                            )}
                            <div className="text-sm text-gray-600 mt-1">
                              {addr.line1}
                              {addr.line2 && `, ${addr.line2}`}
                            </div>
                            <div className="text-sm text-gray-600">
                              {addr.city}, {addr.state} - {addr.pincode}
                            </div>
                            <div className="text-sm text-gray-600">{addr.country}</div>
                          </div>
                          <button
                            className="px-4 py-2 bg-heading text-white rounded hover:bg-heading/90 transition-colors opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (addressId) {
                                onSelectAddress(addressId);
                              }
                            }}
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full bg-gray-100 text-foreground py-3 rounded-md hover:bg-gray-200 transition-colors"
                >
                  + Add New Address
                </button>
              ) : (
                <form onSubmit={handleCreateAddress} className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">Add New Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddress.full_name}
                        onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAddress.line1}
                      onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={newAddress.line2 || ''}
                      onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddress.pincode}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, pincode: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Country *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddress.country}
                        onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded focus:border-heading focus:ring-1 focus:ring-heading"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-heading text-white py-3 rounded-md hover:bg-opacity-90 transition-colors"
                    >
                      Save Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 bg-gray-100 text-foreground py-3 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddressModal;
