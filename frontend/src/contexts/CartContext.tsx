import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Product, CartItem } from '../types';
import { useAuth } from './AuthContext';
import { 
  apiGetCart, 
  apiAddToCart, 
  apiUpdateCartItem, 
  apiDeleteCartItem, 
  apiVerifyProductData 
} from '../lib/api';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  updateItemQuantity: (productId: number, quantity: number) => Promise<void>;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const localData = localStorage.getItem('spAromaCart');
      return localData ? JSON.parse(localData) : [];
    } catch (error) {
      return [];
    }
  });

  const { user } = useAuth();

  // Sync cart items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('spAromaCart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Fetch cart from backend when user logs in
  const refreshCart = async () => {
    if (!user) return;
    try {
      const cartResp = await apiGetCart();
      const serverItemsRaw = cartResp?.items || [];

      // Map backend cart items to frontend CartItem format
      const serverItems: CartItem[] = serverItemsRaw.map((it: any) => ({
        id: it.product_id ?? it.variant_id ?? it.id ?? 0,
        cartItemId: it.item_id ?? it.id,
        variantId: it.variant_id,
        name: it.product_name ?? it.name ?? '',
        type: (it.type || 'Perfume') as any,
        price: it.price ? `₹${it.price}` : (it.display_price ?? '₹0'),
        originalPrice: undefined,
        imageUrl: (it.image_url ?? it.imageUrl ?? it.media?.[0]?.src) || '',
        categories: it.categories ?? [],
        shortDescription: it.description ?? it.shortDescription ?? '',
        longDescription: it.longDescription ?? '',
        ingredients: it.ingredients ?? '',
        howToUse: it.howToUse ?? '',
        quantity: it.quantity ?? it.qty ?? 1,
      }));

      setCartItems(serverItems);
    } catch (err) {
      console.warn('Failed to fetch cart from backend', err);
    }
  };

  useEffect(() => {
    let mounted = true;
    const syncFromServer = async () => {
      if (!user) return;
      await refreshCart();
    };
    syncFromServer();
    return () => { mounted = false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addToCart = async (product: Product, quantity: number) => {
    // CRITICAL: Always verify price and stock from backend before adding to cart
    try {
      const variantId = (product as any).variantId;
      const verification = await apiVerifyProductData(product.id, variantId);
      
      // Check if product is available
      if (!verification.available) {
        throw new Error('Product is out of stock');
      }
      
      // Check if enough stock is available
      if (verification.stock < quantity) {
        throw new Error(`Only ${verification.stock} items available in stock`);
      }
      
      // Optionally: Check if price has changed (uncomment if needed)
      // const expectedPrice = parseFloat(product.price.replace('₹', ''));
      // if (Math.abs(verification.price - expectedPrice) > 0.01) {
      //   console.warn('Price has changed!', { expected: expectedPrice, actual: verification.price });
      // }
      
    } catch (err: any) {
      console.error('Product verification failed:', err);
      // Toast will be shown by the component
      throw err;
    }

    if (user) {
      // Add to backend cart
      try {
        // Send product_id and optional variant_id
        const variantId = (product as any).variantId;
        await apiAddToCart(product.id, quantity, variantId);
        await refreshCart();
      } catch (err) {
        console.error('Failed to add to cart on backend', err);
        // Fall back to local cart
        setCartItems(prevItems => {
          const existingItem = prevItems.find(item => item.id === product.id);
          if (existingItem) {
            return prevItems.map(item =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            );
          }
          return [...prevItems, { ...product, quantity }];
        });
      }
    } else {
      // Not logged in - use local cart
      setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === product.id);
        if (existingItem) {
          return prevItems.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...prevItems, { ...product, quantity }];
      });
    }
  };

  const removeFromCart = async (productId: number) => {
    if (user) {
      try {
        // Find cart item ID for this product
        const cartItem = cartItems.find(item => item.id === productId);
        if (cartItem?.cartItemId) {
          await apiDeleteCartItem(cartItem.cartItemId);
        }
        await refreshCart();
      } catch (err) {
        console.error('Failed to remove from cart on backend', err);
        // Fall back to local removal
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
      }
    } else {
      setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    }
  };

  const updateItemQuantity = async (productId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    if (user) {
      try {
        const cartItem = cartItems.find(item => item.id === productId);
        if (cartItem?.cartItemId) {
          await apiUpdateCartItem(cartItem.cartItemId, quantity);
        }
        await refreshCart();
      } catch (err) {
        console.error('Failed to update cart item on backend', err);
        // Fall back to local update
        setCartItems(prevItems =>
          prevItems.map(item =>
            item.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
          ).filter(item => item.quantity > 0)
        );
      }
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
        ).filter(item => item.quantity > 0)
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const cartTotal = cartItems.reduce((total, item) => {
    const price = parseFloat(item.price.replace('₹', '').replace(',', ''));
    return total + price * item.quantity;
  }, 0);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateItemQuantity,
    clearCart,
    cartCount,
    cartTotal,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
