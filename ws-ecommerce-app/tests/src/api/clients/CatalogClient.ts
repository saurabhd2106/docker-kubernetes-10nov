import type { APIRequestContext, TestInfo } from '@playwright/test';
import type { Category, Product, ProductPage, ProductQuery } from '../types';
import { BaseApiClient } from './BaseApiClient';

export class CatalogClient extends BaseApiClient {
  constructor(request: APIRequestContext, token: string | null = null, testInfo?: TestInfo) {
    super(request, token, testInfo);
  }

  getCategories(): Promise<Category[]> {
    return this.get<Category[]>('/categories', { auth: false });
  }

  getProducts(query: ProductQuery = {}): Promise<ProductPage> {
    return this.get<ProductPage>('/products', {
      auth: false,
      params: {
        category: query.category,
        q: query.q,
        page: query.page ?? 0,
        size: query.size ?? 20,
        sort: query.sort,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
      },
    });
  }

  getProduct(id: number): Promise<Product> {
    return this.get<Product>(`/products/${id}`, { auth: false });
  }
}
