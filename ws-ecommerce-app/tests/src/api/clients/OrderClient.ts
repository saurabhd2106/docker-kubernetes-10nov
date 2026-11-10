import type { APIRequestContext, TestInfo } from '@playwright/test';
import type { CheckoutPayload, Order } from '../types';
import { BaseApiClient } from './BaseApiClient';

export class OrderClient extends BaseApiClient {
  constructor(request: APIRequestContext, token: string | null = null, testInfo?: TestInfo) {
    super(request, token, testInfo);
  }

  checkout(payload: CheckoutPayload): Promise<Order> {
    return this.post<Order>('/checkout', { data: payload });
  }

  listOrders(): Promise<Order[]> {
    return this.get<Order[]>('/orders');
  }

  getOrder(id: number): Promise<Order> {
    return this.get<Order>(`/orders/${id}`);
  }

  cancel(id: number): Promise<Order> {
    return this.post<Order>(`/orders/${id}/cancel`);
  }
}
