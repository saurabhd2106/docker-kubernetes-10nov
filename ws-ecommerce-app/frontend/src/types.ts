export interface Category {
  id: number
  name: string
  slug: string
}

export interface Product {
  id: number
  sku: string
  name: string
  description: string
  priceCents: number
  imagePath: string
  stockQuantity: number
  categorySlug: string
  categoryName: string
}

export interface ProductPage {
  items: Product[]
  page: number
  size: number
  total: number
}

export interface AuthUser {
  username: string
  displayName: string
  token: string
}

export interface CartItem {
  id: number
  productId: number
  productName: string
  imagePath: string
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
}

export interface Cart {
  id: number
  items: CartItem[]
  itemCount: number
  subtotalCents: number
  discountCents: number
  totalCents: number
  promoCode: string | null
}

export interface OrderItem {
  id: number
  productName: string
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
}

export interface Order {
  id: number
  status: string
  subtotalCents: number
  discountCents: number
  totalCents: number
  promoCode: string | null
  cardLast4: string
  shippingName: string
  shippingLine1: string
  shippingCity: string
  shippingRegion: string
  shippingPostal: string
  createdAt: string
  items: OrderItem[]
}

export interface ApiErrorBody {
  code: string
  message: string
  fields?: Record<string, string>
}
