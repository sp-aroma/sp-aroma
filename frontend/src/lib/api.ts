// ===============================
// API CONFIG
// ===============================

import { ProductCache, UserCache, CartCache, OrdersCache, AddressesCache, invalidateCache, verifyCriticalData } from './cache';

// Export cache utilities for components
export { ProductCache, UserCache, CartCache, OrdersCache, AddressesCache, invalidateCache, verifyCriticalData };

// In dev: Vite proxy → relative paths
// In prod: absolute backend URL
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const TOKEN_KEY = 'spAromaToken';

function resolveUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;

  // Dev → Vite proxy (relative)
  if (!API_BASE) return p;

  // Prod → absolute backend
  return `${API_BASE.replace(/\/$/, '')}${p}`;
}

// ===============================
// TOKEN HELPERS
// ===============================
export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// ===============================
// RESPONSE PARSER
// ===============================
async function parseResponse(res: Response) {
  const ct = res.headers.get('content-type') || '';

  if (ct.includes('application/json')) {
    const json = await res.json().catch(() => null);
    if (!res.ok) throw { status: res.status, body: json };
    return json;
  }

  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) throw { status: res.status, body: json };
    return json;
  } catch {
    if (!res.ok) throw { status: res.status, body: text };
    return text;
  }
}

// ===============================
// CORE HTTP METHODS
// ===============================
function authHeaders(token?: string): Record<string, string> {
  const t = token ?? getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function getJson(path: string, token?: string) {
  const res = await fetch(resolveUrl(path), {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(token),
  });
  return parseResponse(res);
}

// Public GET without auth headers
export async function getJsonPublic(path: string) {
  const res = await fetch(resolveUrl(path), {
    method: 'GET',
    credentials: 'include',
  });
  return parseResponse(res);
}

export async function postJson(path: string, body: any, token?: string) {
  const res = await fetch(resolveUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

export async function putJson(path: string, body: any, token?: string) {
  const res = await fetch(resolveUrl(path), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

export async function patchJson(path: string, body: any, token?: string) {
  const res = await fetch(resolveUrl(path), {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

export async function deleteJson(path: string, token?: string) {
  const res = await fetch(resolveUrl(path), {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(token),
  });
  return parseResponse(res);
}

export async function postFormData(path: string, formData: FormData, token?: string) {
  const res = await fetch(resolveUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
    body: formData,
  });
  return parseResponse(res);
}

// ===============================
// FORM (OAuth2 Login)
// ===============================
export async function postForm(path: string, form: Record<string, string>) {
  const res = await fetch(resolveUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(form),
  });
  return parseResponse(res);
}

// ===============================
// AUTH API
// ===============================
export const apiRegister = (email: string, password: string, password_confirm: string) =>
  postJson('/accounts/register', { email, password, password_confirm });

export const apiVerifyRegistration = (email: string, otp: string) =>
  patchJson('/accounts/register/verify', { email, otp });

export const apiLogin = (username: string, password: string) =>
  postForm('/accounts/login', { username, password });

export const apiLogout = async () => {
  const response = await postJson('/accounts/logout', {});
  // Clear all cached data on logout
  await invalidateCache('all');
  return response;
};

export const apiResetPassword = (email: string) =>
  postJson('/accounts/reset-password', { email });

export const apiVerifyResetPassword = (
  email: string,
  otp: string,
  password: string,
  password_confirm: string
) =>
  patchJson('/accounts/reset-password/verify', {
    email,
    otp,
    password,
    password_confirm,
  });

export const apiResendOTP = (email: string, request_type: string) =>
  postJson('/accounts/otp', { email, request_type });

// ===============================
// USER API
// ===============================
export const apiGetCurrentUser = async () => {
  // Try to get from cache first
  const cached = await UserCache.get();
  if (cached) {
    console.log('📦 Using cached user');
    return { user: cached };
  }

  // Cache miss or expired - fetch from API
  console.log('🌐 Fetching user from API');
  const response = await getJson('/accounts/me');
  
  // Store in cache for future use
  if (response?.user) {
    await UserCache.set(response.user);
  }
  
  return response;
};

export const apiUpdateCurrentUser = (data: any) =>
  putJson('/accounts/me', data);

export const apiChangePassword = (
  current_password: string,
  password: string,
  password_confirm: string
) =>
  patchJson('/accounts/me/password', {
    current_password,
    password,
    password_confirm,
  });

export const apiChangeEmail = (email: string) =>
  postJson('/accounts/me/email', { email });

export const apiVerifyChangeEmail = (otp: string) =>
  patchJson('/accounts/me/email/verify', { otp });

export const apiGetUser = (userId: number) =>
  getJson(`/accounts/${userId}`);

export const apiDeleteAccount = () =>
  deleteJson('/accounts/me');

// ===============================
// PRODUCTS API (PUBLIC)
// ===============================
export const apiGetProducts = async () => {
  // Try to get from cache first
  const cached = await ProductCache.get();
  if (cached && !ProductCache.isExpired()) {
    console.log('📦 Using cached products');
    return { products: cached };
  }

  // Cache miss or expired - fetch from API
  console.log('🌐 Fetching products from API');
  const response = await getJsonPublic('/products/');
  
  // Store in cache for future use
  if (response?.products) {
    await ProductCache.set(response.products);
  }
  
  return response;
};

export const apiGetProduct = async (productId: number | string) => {
  // Try to get from cache first
  const cached = await ProductCache.getById(Number(productId));
  if (cached) {
    console.log(`📦 Using cached product ${productId}`);
    return { product: cached };
  }

  // Cache miss - fetch from API
  console.log(`🌐 Fetching product ${productId} from API`);
  const response = await getJsonPublic(`/products/${productId}`);
  
  // Note: Individual product fetches don't update cache
  // Cache is only updated by apiGetProducts() to maintain consistency
  
  return response;
};

export const apiCreateProduct = (data: any) =>
  postJson('/products/', data);

export const apiCreateProductComprehensive = (data: any) =>
  postJson('/products/comprehensive', data);

export const apiUploadImageTemp = async (files: File[]): Promise<Array<{src: string, cloudinary_id: string, alt: string, type: string}>> => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('alt', 'Product image');
  
  return postFormData('/products/media/upload-temp', formData).then(res => res.images);
};

export const apiUpdateProduct = (productId: number, data: any) =>
  putJson(`/products/${productId}`, data);

export const apiDeleteProduct = (productId: number) =>
  deleteJson(`/products/${productId}`);

// Product Images API
export const apiUploadProductImages = (productId: number, files: FileList, alt?: string) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  if (alt) formData.append('alt', alt);
  return postFormData(`/products/${productId}/media`, formData);
};

export const apiGetProductImages = (productId: number) =>
  getJsonPublic(`/products/${productId}/media`);

export const apiDeleteProductImage = (productId: number, mediaIds: string) =>
  deleteJson(`/products/${productId}/media?media_ids=${mediaIds}`);

// ===============================
// PRODUCT VARIANTS API
// ===============================
export const apiGetVariant = (variantId: number) =>
  getJson(`/products/variants/${variantId}`);

export const apiUpdateVariant = (variantId: number, data: any) =>
  putJson(`/products/variants/${variantId}`, data);

export const apiGetProductVariants = (productId: number) =>
  getJson(`/products/${productId}/variants`);

// Helper: Verify critical product data (price, stock) before cart operations
export const apiVerifyProductData = async (productId: number, variantId?: number) => {
  console.log(`🔍 Verifying product data for product ${productId}`);
  
  // Always fetch fresh data from backend for critical operations
  const response = await getJsonPublic(`/products/${productId}`);
  const product = response?.product;
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  // If variant specified, find the variant's data
  if (variantId && product.variants) {
    const variant = product.variants.find((v: any) => v.variant_id === variantId);
    if (!variant) {
      throw new Error('Variant not found');
    }
    
    return {
      available: variant.stock > 0,
      price: variant.price,
      stock: variant.stock,
      product: product,
      variant: variant
    };
  }
  
  // Default product data
  return {
    available: (product.variants?.[0]?.stock ?? 0) > 0,
    price: product.variants?.[0]?.price ?? product.price ?? 0,
    stock: product.variants?.[0]?.stock ?? 0,
    product: product
  };
};

// ===============================
// ADDRESSES API
// ===============================
export const apiGetAddresses = async () => {
  try {
    // Check cache first for instant response
    const cached = await AddressesCache.get();
    if (cached && !AddressesCache.isExpired()) {
      console.log('✅ Returning cached addresses data (instant)');
      
      // Background refresh to keep data fresh
      getJson('/addresses/').then(async (freshData) => {
        if (freshData) {
          await AddressesCache.set(freshData);
          console.log('🔄 Addresses cache refreshed in background');
        }
      }).catch(err => console.warn('Background addresses refresh failed:', err));
      
      return cached;
    }
    
    // Cache miss - fetch from API
    console.log('⚠️ Addresses cache miss - fetching from API');
    const response = await getJson('/addresses/');
    if (response) {
      await AddressesCache.set(response);
    }
    return response;
  } catch (error) {
    console.error('Error in apiGetAddresses:', error);
    throw error;
  }
};

export const apiGetAddress = (addressId: number) =>
  getJson(`/addresses/${addressId}`);

export const apiCreateAddress = async (data: any) => {
  const response = await postJson('/addresses/', data);
  if (response) {
    await invalidateCache('addresses');
  }
  return response;
};

export const apiUpdateAddress = async (addressId: number, data: any) => {
  const response = await putJson(`/addresses/${addressId}`, data);
  if (response) {
    await invalidateCache('addresses');
  }
  return response;
};

export const apiDeleteAddress = async (addressId: number) => {
  const response = await deleteJson(`/addresses/${addressId}`);
  if (response) {
    await invalidateCache('addresses');
  }
  return response;
};

// ===============================
// CART API
// ===============================
export const apiGetCart = async () => {
  try {
    // Check cache first for instant response
    const cached = await CartCache.get();
    if (cached && !CartCache.isExpired()) {
      console.log('✅ Returning cached cart data (instant)');
      
      // Background refresh to keep data fresh
      getJson('/cart/').then(async (freshData) => {
        if (freshData) {
          await CartCache.set(freshData);
          console.log('🔄 Cart cache refreshed in background');
        }
      }).catch(err => console.warn('Background cart refresh failed:', err));
      
      return cached;
    }
    
    // Cache miss - fetch from API
    console.log('⚠️ Cart cache miss - fetching from API');
    const response = await getJson('/cart/');
    if (response) {
      await CartCache.set(response);
    }
    return response;
  } catch (error) {
    console.error('Error in apiGetCart:', error);
    throw error;
  }
};

export const apiAddToCart = async (product_id: number, quantity: number, variant_id?: number) => {
  const response = await postJson('/cart/add', { product_id, quantity, variant_id });
  if (response) {
    await invalidateCache('cart'); // Clear cache to fetch fresh data
  }
  return response;
};

export const apiUpdateCartItem = async (itemId: number, quantity: number) => {
  const response = await putJson(`/cart/item/${itemId}`, { quantity });
  if (response) {
    await invalidateCache('cart');
  }
  return response;
};

export const apiDeleteCartItem = async (itemId: number) => {
  const response = await deleteJson(`/cart/item/${itemId}`);
  if (response) {
    await invalidateCache('cart');
  }
  return response;
};

export const apiCheckout = async (addressId: number) => {
  const response = await postJson(`/cart/checkout?address_id=${addressId}`, {});
  
  // After successful checkout, invalidate caches
  if (response?.order || response?.success) {
    console.log('✅ Order placed - invalidating product, cart, and orders cache');
    await invalidateCache('products'); // Stock changed
    await invalidateCache('cart'); // Cart is now empty
    await invalidateCache('orders'); // New order added
  }
  
  return response;
};

// ===============================
// ORDERS API
// ===============================
export const apiGetOrders = async () => {
  try {
    // Check cache first for instant response
    const cached = await OrdersCache.get();
    if (cached && !OrdersCache.isExpired()) {
      console.log('✅ Returning cached orders data (instant)');
      
      // Background refresh to keep data fresh
      getJson('/orders/').then(async (freshData) => {
        if (freshData) {
          await OrdersCache.set(freshData);
          console.log('🔄 Orders cache refreshed in background');
        }
      }).catch(err => console.warn('Background orders refresh failed:', err));
      
      return cached;
    }
    
    // Cache miss - fetch from API
    console.log('⚠️ Orders cache miss - fetching from API');
    const response = await getJson('/orders/');
    if (response) {
      await OrdersCache.set(response);
    }
    return response;
  } catch (error) {
    console.error('Error in apiGetOrders:', error);
    throw error;
  }
};

export const apiGetOrder = (orderId: number) =>
  getJson(`/orders/${orderId}`);

export const apiGetAllOrders = () =>
  getJson('/orders/admin/allorders');

export const apiGetAdminOrder = (orderId: number) =>
  getJson(`/orders/admin/${orderId}`);

export const apiUpdateOrderStatus = (orderId: number, status: string) =>
  patchJson(`/orders/${orderId}/status`, { status });

export const apiGetOrderAnalytics = () =>
  getJson('/orders/admin/analytics');

export const apiAdminUpdateOrderStatus = (orderId: number, status: string) =>
  patchJson(`/orders/admin/${orderId}/status`, { status });

// ===============================
// ADMIN API
// ===============================
export const apiGetAllUsers = (skip: number = 0, limit: number = 100) =>
  getJson(`/admin/users?skip=${skip}&limit=${limit}`);

export const apiGetUserDetails = (userId: number) =>
  getJson(`/admin/users/${userId}`);

export const apiUpdateUser = (userId: number, data: any) =>
  patchJson(`/admin/users/${userId}`, data);

export const apiDeleteUser = (userId: number) =>
  deleteJson(`/admin/users/${userId}`);

export const apiGetAdminAnalytics = () =>
  getJson('/admin/analytics');

export const apiGetEmailRecipients = () =>
  getJson('/admin/emails/recipients');

export const apiSendBulkEmail = (data: {
  subject: string;
  html_content: string;
  send_to_all: boolean;
  recipient_email?: string;
}) => postJson('/admin/emails/send-bulk', data);


// ===============================
// PAYMENTS API
// ===============================
export const apiCreatePayment = (orderId: number) =>
  postJson(`/payments/create/${orderId}`, {});

export const apiGetAllPayments = (skip: number = 0, limit: number = 100) =>
  getJson(`/payments/admin/all?skip=${skip}&limit=${limit}`);

// ===============================
// ATTRIBUTES API
// ===============================
export const apiGetAttributes = () => getJson('/attributes');