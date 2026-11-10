import type { APIRequestContext, TestInfo } from '@playwright/test';
import type { Cart } from '../types';
import { BaseApiClient } from './BaseApiClient';

export class CartClient extends BaseApiClient {
  constructor(request: APIRequestContext, token: string | null = null, testInfo?: TestInfo) {
    super(request, token, testInfo);
  }

  getCart(): Promise<Cart> {
    return this.get<Cart>('/cart');
  }

  addItem(productId: number, quantity: number): Promise<Cart> {
    return this.post<Cart>('/cart/items', { data: { productId, quantity } });
  }

  updateItem(itemId: number, quantity: number): Promise<Cart> {
    return this.patch<Cart>(`/cart/items/${itemId}`, { data: { quantity } });
  }

  removeItem(itemId: number): Promise<Cart> {
    return this.delete<Cart>(`/cart/items/${itemId}`);
  }

  applyPromo(code: string): Promise<Cart> {
    return this.post<Cart>('/cart/promo', { data: { code } });
  }

  clearPromo(): Promise<Cart> {
    return this.delete<Cart>('/cart/promo');
  }
}
