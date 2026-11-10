import type {
  ApiErrorBody,
  AuthUser,
  Cart,
  Category,
  Order,
  Product,
  ProductPage,
} from './types'

const TOKEN_KEY = 'ecommerce_token'
const USER_KEY = 'ecommerce_user'

export class ApiError extends Error {
  code: string
  status: number
  fields?: Record<string, string>

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || 'Request failed')
    this.status = status
    this.code = body.code
    this.fields = body.fields
  }
}

export function getStoredAuth(): AuthUser | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const raw = localStorage.getItem(USER_KEY)
  if (!token || !raw) return null
  try {
    const user = JSON.parse(raw) as Omit<AuthUser, 'token'>
    return { ...user, token }
  } catch {
    return null
  }
}

export function storeAuth(user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, user.token)
  localStorage.setItem(USER_KEY, JSON.stringify({ username: user.username, displayName: user.displayName }))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

async function request<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(path, { ...options, headers })
  if (res.status === 204) return undefined as T

  const text = await res.text()
  const body = text ? JSON.parse(text) : null

  if (!res.ok) {
    throw new ApiError(res.status, body ?? { code: 'ERROR', message: res.statusText })
  }
  return body as T
}

export const api = {
  getCategories: () => request<Category[]>('/api/categories'),
  getProducts: (params: {
    category?: string
    q?: string
    page?: number
    size?: number
    sort?: string
    minPrice?: number
    maxPrice?: number
  }) => {
    const qs = new URLSearchParams()
    if (params.category) qs.set('category', params.category)
    if (params.q) qs.set('q', params.q)
    if (params.sort) qs.set('sort', params.sort)
    if (params.minPrice !== undefined) qs.set('minPrice', String(params.minPrice))
    if (params.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice))
    qs.set('page', String(params.page ?? 0))
    qs.set('size', String(params.size ?? 20))
    return request<ProductPage>(`/api/products?${qs}`)
  },
  getProduct: (id: number) => request<Product>(`/api/products/${id}`),
  register: (payload: { username: string; password: string; displayName?: string }) =>
    request<AuthUser>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { username: string; password: string }) =>
    request<AuthUser>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request<{ id: number; username: string; displayName: string }>('/api/auth/me', {}, true),
  getCart: () => request<Cart>('/api/cart', {}, true),
  addToCart: (productId: number, quantity: number) =>
    request<Cart>('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }, true),
  updateCartItem: (itemId: number, quantity: number) =>
    request<Cart>(`/api/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }, true),
  removeCartItem: (itemId: number) =>
    request<Cart>(`/api/cart/items/${itemId}`, { method: 'DELETE' }, true),
  applyPromo: (code: string) =>
    request<Cart>('/api/cart/promo', { method: 'POST', body: JSON.stringify({ code }) }, true),
  clearPromo: () => request<Cart>('/api/cart/promo', { method: 'DELETE' }, true),
  checkout: (payload: Record<string, string>) =>
    request<Order>('/api/checkout', { method: 'POST', body: JSON.stringify(payload) }, true),
  getOrders: () => request<Order[]>('/api/orders', {}, true),
  getOrder: (id: number) => request<Order>(`/api/orders/${id}`, {}, true),
  cancelOrder: (id: number) =>
    request<Order>(`/api/orders/${id}/cancel`, { method: 'POST' }, true),
  demoReset: () =>
    request<{ ok: boolean; productsRestored: number; message: string }>('/api/demo/reset', {
      method: 'POST',
    }),
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}
