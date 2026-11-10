export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  imagePath: string;
  stockQuantity: number;
  categorySlug: string;
  categoryName: string;
}

export interface ProductPage {
  items: Product[];
  page: number;
  size: number;
  total: number;
}

export interface AuthUser {
  username: string;
  displayName: string;
  token: string;
}

export interface MeResponse {
  id: number;
  username: string;
  displayName: string;
}

export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  imagePath: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Cart {
  id: number;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  promoCode: string | null;
}

export interface OrderItem {
  id: number;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Order {
  id: number;
  status: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  promoCode: string | null;
  cardLast4: string;
  shippingName: string;
  shippingLine1: string;
  shippingCity: string;
  shippingRegion: string;
  shippingPostal: string;
  createdAt: string;
  items: OrderItem[];
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface HealthResponse {
  status: string;
}

export interface DemoResetResponse {
  ok: boolean;
  productsRestored: number;
  message: string;
}

export interface ProductQuery {
  category?: string;
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface CheckoutPayload {
  shippingName: string;
  shippingLine1: string;
  shippingCity: string;
  shippingRegion: string;
  shippingPostal: string;
  cardName: string;
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCvc: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
  }
}
