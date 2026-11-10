import type { APIRequestContext, TestInfo } from '@playwright/test';
import type { AuthUser, MeResponse } from '../types';
import { BaseApiClient } from './BaseApiClient';

export class AuthClient extends BaseApiClient {
  constructor(request: APIRequestContext, token: string | null = null, testInfo?: TestInfo) {
    super(request, token, testInfo);
  }

  register(payload: { username: string; password: string; displayName?: string }): Promise<AuthUser> {
    return this.post<AuthUser>('/auth/register', { data: payload, auth: false });
  }

  login(payload: { username: string; password: string }): Promise<AuthUser> {
    return this.post<AuthUser>('/auth/login', { data: payload, auth: false });
  }

  me(): Promise<MeResponse> {
    return this.get<MeResponse>('/auth/me');
  }
}
