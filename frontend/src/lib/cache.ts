// Cache management system with IndexedDB for products and localStorage for user data
// Includes data integrity checks and automatic cache invalidation

const DB_NAME = 'sp_aroma_cache';
const DB_VERSION = 1;
const PRODUCTS_STORE = 'products';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const USER_CACHE_KEY = 'sp_aroma_user';
const PRODUCTS_CACHE_KEY = 'sp_aroma_products_meta';

// Generate a simple hash for data integrity check
const generateHash = (data: any): string => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// IndexedDB initialization
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create products store if it doesn't exist
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        const store = db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
    };
  });
};

// Product Cache Management
export const ProductCache = {
  async set(products: any[]): Promise<void> {
    try {
      const db = await initDB();
      const transaction = db.transaction([PRODUCTS_STORE], 'readwrite');
      const store = transaction.objectStore(PRODUCTS_STORE);

      const timestamp = Date.now();
      const hash = generateHash(products);

      // Clear existing products
      await store.clear();

      // Add new products with metadata
      for (const product of products) {
        await store.add({
          ...product,
          _cached_at: timestamp,
          _hash: generateHash(product),
        });
      }

      // Store metadata in localStorage
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({
        timestamp,
        count: products.length,
        hash,
      }));

      db.close();
    } catch (error) {
      console.error('Failed to cache products:', error);
    }
  },

  async get(): Promise<any[] | null> {
    try {
      const meta = localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (!meta) return null;

      const { timestamp } = JSON.parse(meta);
      
      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_DURATION) {
        await this.clear();
        return null;
      }

      const db = await initDB();
      const transaction = db.transaction([PRODUCTS_STORE], 'readonly');
      const store = transaction.objectStore(PRODUCTS_STORE);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const products = request.result.map(p => {
            // Remove cache metadata before returning
            const { _cached_at, _hash, ...product } = p;
            return product;
          });
          db.close();
          resolve(products.length > 0 ? products : null);
        };
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to get cached products:', error);
      return null;
    }
  },

  async getById(id: number): Promise<any | null> {
    try {
      const db = await initDB();
      const transaction = db.transaction([PRODUCTS_STORE], 'readonly');
      const store = transaction.objectStore(PRODUCTS_STORE);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const product = request.result;
          db.close();
          if (!product) {
            resolve(null);
            return;
          }

          // Check if individual product cache is expired
          if (Date.now() - product._cached_at > CACHE_DURATION) {
            resolve(null);
            return;
          }

          // Remove cache metadata
          const { _cached_at, _hash, ...cleanProduct } = product;
          resolve(cleanProduct);
        };
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to get cached product:', error);
      return null;
    }
  },

  async clear(): Promise<void> {
    try {
      const db = await initDB();
      const transaction = db.transaction([PRODUCTS_STORE], 'readwrite');
      const store = transaction.objectStore(PRODUCTS_STORE);
      await store.clear();
      db.close();
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear product cache:', error);
    }
  },

  isExpired(): boolean {
    const meta = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!meta) return true;
    const { timestamp } = JSON.parse(meta);
    return Date.now() - timestamp > CACHE_DURATION;
  }
};

// User Cache Management (using localStorage with encryption-like obfuscation)
export const UserCache = {
  set(user: any): void {
    try {
      const timestamp = Date.now();
      const hash = generateHash(user);
      
      const cacheData = {
        data: user,
        timestamp,
        hash,
        _version: DB_VERSION,
      };

      // Store with obfuscation (not real encryption, just basic integrity)
      const encoded = btoa(JSON.stringify(cacheData));
      localStorage.setItem(USER_CACHE_KEY, encoded);
    } catch (error) {
      console.error('Failed to cache user:', error);
    }
  },

  get(): any | null {
    try {
      const encoded = localStorage.getItem(USER_CACHE_KEY);
      if (!encoded) return null;

      const cacheData = JSON.parse(atob(encoded));
      
      // Check cache expiry
      if (Date.now() - cacheData.timestamp > CACHE_DURATION) {
        this.clear();
        return null;
      }

      // Verify data integrity
      const currentHash = generateHash(cacheData.data);
      if (currentHash !== cacheData.hash) {
        console.warn('User cache integrity check failed');
        this.clear();
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error('Failed to get cached user:', error);
      this.clear();
      return null;
    }
  },

  clear(): void {
    localStorage.removeItem(USER_CACHE_KEY);
  },

  isExpired(): boolean {
    try {
      const encoded = localStorage.getItem(USER_CACHE_KEY);
      if (!encoded) return true;
      const cacheData = JSON.parse(atob(encoded));
      return Date.now() - cacheData.timestamp > CACHE_DURATION;
    } catch {
      return true;
    }
  }
};

// Cache invalidation on important events
export const invalidateCache = (type?: 'products' | 'user' | 'all') => {
  if (!type || type === 'all') {
    ProductCache.clear();
    UserCache.clear();
  } else if (type === 'products') {
    ProductCache.clear();
  } else if (type === 'user') {
    UserCache.clear();
  }
};

// Helper to verify critical data from backend
export const verifyCriticalData = async (
  _productId: number,
  fetchFn: () => Promise<any>
): Promise<{ price: number; stock: number; available: boolean }> => {
  try {
    const response = await fetchFn();
    return {
      price: response.price || 0,
      stock: response.stock || 0,
      available: response.stock > 0,
    };
  } catch (error) {
    console.error('Failed to verify critical data:', error);
    throw new Error('Unable to verify product availability');
  }
};
