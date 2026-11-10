import type { APIRequestContext, TestInfo } from '@playwright/test';
import type { DemoResetResponse, HealthResponse } from '../types';
import { BaseApiClient } from './BaseApiClient';

export class DemoClient extends BaseApiClient {
  constructor(request: APIRequestContext, token: string | null = null, testInfo?: TestInfo) {
    super(request, token, testInfo);
  }

  health(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/health', { auth: false });
  }

  reset(): Promise<DemoResetResponse> {
    return this.post<DemoResetResponse>('/demo/reset', { auth: false });
  }
}
