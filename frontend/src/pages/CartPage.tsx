import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AddressModal from '../components/AddressModal';

const CartPage = () => {
  const { cartItems, removeFromCart, updateItemQuantity, cartTotal, cartCount } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showAddressModal, setShowAddressModal] = useState(false);

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    setShowAddressModal(true);
  };

  const handleAddressSelect = (addressId: number) => {
    setShowAddressModal(false);
    // Navigate to checkout page with selected address
    navigate('/checkout', { state: { addressId } });
  };

  if (cartCount === 0) {
    return (
      <main className="pt-32 min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-4xl md:text-5xl font-light tracking-widest">Your Cart is Empty</h1>
        <p className="mt-4 text-foreground text-lg">Looks like you haven't added any fragrances yet.</p>
        <Link 
          to="/products"
          className="mt-8 inline-block bg-heading text-white font-sans capitalize text-lg px-12 py-4 rounded-md hover:bg-opacity-90 transition-colors"
        >
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <>
      <main className="pt-32 pb-24 bg-primary-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-light tracking-widest text-center mb-12">
            Shopping Cart
          </h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-lg shadow-md">
              <div className="space-y-6">
                {cartItems.map(item => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-center gap-6 border-b border-gray-200 pb-6 last:border-b-0">
                    <img src={item.imageUrl} alt={item.name} className="w-24 h-24 object-cover rounded-md" />
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-xl font-light tracking-widest">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.type}</p>
                      <p className="font-sans text-lg text-heading mt-1">{item.price}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-gray-200 rounded-md">
                        <button 
                          onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 h-10 flex items-center justify-center font-sans text-base">{item.quantity}</span>
                        <button 
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md h-fit">
              <h2 className="text-2xl font-light tracking-widest border-b border-gray-200 pb-4">
                Order Summary
              </h2>
              <div className="space-y-4 mt-6">
                <div className="flex justify-between text-foreground">
                  <span>Subtotal ({cartCount} items)</span>
                  <span className="font-sans">₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-foreground">
                  <span>Shipping</span>
                  <span className="font-sans text-sm">Calculated at checkout</span>
                </div>
              </div>
              <div className="flex justify-between text-xl font-bold text-dark-text border-t border-gray-200 mt-6 pt-4">
                <span>Total</span>
                <span className="font-sans">₹{cartTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleProceedToCheckout}
                className="w-full mt-8 bg-heading text-white font-sans uppercase text-lg tracking-wider py-3.5 rounded-md hover:bg-opacity-90 transition-colors"
              >
                Proceed to Checkout
              </button>
              {!isAuthenticated && (
                <p className="text-sm text-center text-gray-600 mt-4">
                  Please log in to complete your purchase
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelectAddress={handleAddressSelect}
      />
    </>
  );
};

export default CartPage;
