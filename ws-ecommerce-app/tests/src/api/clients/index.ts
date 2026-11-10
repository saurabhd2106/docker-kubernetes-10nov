import type { APIRequestContext, TestInfo } from '@playwright/test';
import { AuthClient } from './AuthClient';
import { CartClient } from './CartClient';
import { CatalogClient } from './CatalogClient';
import { DemoClient } from './DemoClient';
import { OrderClient } from './OrderClient';

export class ApiClients {
  readonly auth: AuthClient;
  readonly catalog: CatalogClient;
  readonly cart: CartClient;
  readonly orders: OrderClient;
  readonly demo: DemoClient;
  readonly token: string | null;

  private readonly request: APIRequestContext;
  private readonly testInfo?: TestInfo;

  constructor(request: APIRequestContext, token: string | null = null, testInfo?: TestInfo) {
    this.request = request;
    this.testInfo = testInfo;
    this.token = token;
    this.auth = new AuthClient(request, token, testInfo);
    this.catalog = new CatalogClient(request, token, testInfo);
    this.cart = new CartClient(request, token, testInfo);
    this.orders = new OrderClient(request, token, testInfo);
    this.demo = new DemoClient(request, token, testInfo);
  }

  withToken(token: string): ApiClients {
    return new ApiClients(this.request, token, this.testInfo);
  }
}

export { AuthClient, CartClient, CatalogClient, DemoClient, OrderClient };
export { BaseApiClient } from './BaseApiClient';
