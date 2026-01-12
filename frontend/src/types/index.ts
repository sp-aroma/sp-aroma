export interface Testimonial {
  quote: string;
  author: string;
  location: string;
  avatarUrl: string;
}

export interface Feature {
  title: string;
  description: string;
}

export interface Service {
  icon: React.ElementType;
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Product {
  id: number;
  name: string;
  type: 'Attar' | 'Perfume';
  price: string;
  originalPrice?: string;
  imageUrl: string;
  categories: string[];
  shortDescription: string;
  longDescription: string;
  ingredients: string;
  howToUse: string;
}

export interface CartItem extends Product {
  quantity: number;
  cartItemId?: number; // Backend cart item ID for API operations
  variantId?: number;  // Product variant ID
}

export interface Order {
  id: string;
  date: string;
  status: 'Processing' | 'Shipped' | 'Delivered';
  total: number;
  items: {
    name: string;
    quantity: number;
    imageUrl: string;
  }[];
}

export interface Address {
  address_id?: number;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

export interface User {
  user_id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_superuser?: boolean;
  is_admin?: boolean; // Alias for is_superuser
  is_verified_email?: boolean;
  date_joined?: string;
  last_login?: string;
}
