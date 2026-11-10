import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test';
import { env } from '../../config/env';
import { ApiError, type ApiErrorBody } from '../types';

export type RequestOptions = {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  auth?: boolean;
};

export class BaseApiClient {
  constructor(
    protected readonly request: APIRequestContext,
    protected readonly token: string | null = null,
    protected readonly testInfo?: TestInfo,
  ) {}

  withToken(token: string): this {
    const Ctor = this.constructor as new (
      request: APIRequestContext,
      token: string | null,
      testInfo?: TestInfo,
    ) => this;
    return new Ctor(this.request, token, this.testInfo);
  }

  protected url(path: string): string {
    const base = env.apiUrl.replace(/\/$/, '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    // path may already include /api when called with absolute path; prefer relative to apiUrl
    if (suffix.startsWith('/api/')) {
      return `${base}${suffix.slice(4)}`;
    }
    return `${base}${suffix}`;
  }

  protected async send(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    options: RequestOptions = {},
  ): Promise<APIResponse> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    if (options.data !== undefined && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.auth !== false && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const params: Record<string, string | number | boolean> = {};
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) params[key] = value;
      }
    }

    const response = await this.request.fetch(this.url(path), {
      method,
      headers,
      params,
      data: options.data,
      failOnStatusCode: false,
    });

    await this.attachExchange(method, path, options, response);
    return response;
  }

  protected async parse<T>(response: APIResponse): Promise<T> {
    if (response.status() === 204) {
      return undefined as T;
    }

    const text = await response.text();
    const body = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok()) {
      const errorBody = (body as ApiErrorBody | null) ?? {
        code: 'ERROR',
        message: response.statusText(),
      };
      throw new ApiError(response.status(), errorBody);
    }

    return body as T;
  }

  protected async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.parse<T>(await this.send('GET', path, options));
  }

  protected async post<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.parse<T>(await this.send('POST', path, options));
  }

  protected async patch<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.parse<T>(await this.send('PATCH', path, options));
  }

  protected async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.parse<T>(await this.send('DELETE', path, options));
  }

  private async attachExchange(
    method: string,
    path: string,
    options: RequestOptions,
    response: APIResponse,
  ): Promise<void> {
    if (!this.testInfo) return;
    try {
      const bodyText = await response.text();
      // response.text() consumes body; recreate via clone is not available — re-read from buffer
      // Playwright caches body; calling text() again is fine on APIResponse
      const payload = {
        method,
        url: this.url(path),
        request: {
          headers: options.headers,
          params: options.params,
          data: options.data,
        },
        response: {
          status: response.status(),
          body: bodyText ? safeJson(bodyText) : null,
        },
      };
      await this.testInfo.attach(`${method} ${path}`, {
        body: JSON.stringify(payload, null, 2),
        contentType: 'application/json',
      });
    } catch {
      // Never fail a test because of report attachment issues
    }
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
