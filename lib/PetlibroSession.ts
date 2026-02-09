'use strict';

import * as https from 'https';
import * as crypto from 'crypto';
import {
  PetlibroApiResponse,
  PetlibroSessionConfig,
  APP_ID,
  APP_SN,
  APP_VERSION,
  ERROR_NOT_LOGGED_IN,
} from './types';

export class PetlibroSession {

  private baseUrl: string;
  private email: string;
  private password: string;
  private region: string;
  private timezone: string;
  private token: string | null;
  private reLoginPromise: Promise<string> | null = null;

  constructor(config: PetlibroSessionConfig) {
    this.baseUrl = config.baseUrl;
    this.email = config.email;
    this.password = config.password;
    this.region = config.region;
    this.timezone = config.timezone;
    this.token = config.token ?? null;
  }

  static hashPassword(password: string): string {
    return crypto.createHash('md5').update(password).digest('hex');
  }

  setToken(token: string): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T = unknown>(path: string, body?: Record<string, unknown>): Promise<T> {
    const response = await this.rawRequest<T>(path, body);

    if (response.code === ERROR_NOT_LOGGED_IN) {
      await this.reLogin();
      const retryResponse = await this.rawRequest<T>(path, body);
      if (retryResponse.code !== 0) {
        throw new Error(`Petlibro API error after re-login: ${retryResponse.msg} (code ${retryResponse.code})`);
      }
      return retryResponse.data;
    }

    if (response.code !== 0) {
      throw new Error(`Petlibro API error: ${response.msg} (code ${response.code})`);
    }

    return response.data;
  }

  async login(email: string, password: string): Promise<string> {
    const hashedPassword = PetlibroSession.hashPassword(password);

    const loginBody = {
      appId: APP_ID,
      appSn: APP_SN,
      country: this.region,
      email,
      password: hashedPassword,
      phoneBrand: 'Homey',
      phoneSystemVersion: '1.0',
      timezone: this.timezone,
      thirdId: null,
      type: null,
    };

    const response = await this.rawRequest<{ token: string }>(
      '/member/auth/login',
      loginBody,
    );

    if (response.code !== 0) {
      throw new Error(`Login failed: ${response.msg}`);
    }

    this.token = response.data.token;
    this.email = email;
    this.password = password;

    return response.data.token;
  }

  private async reLogin(): Promise<string> {
    if (this.reLoginPromise) return this.reLoginPromise;

    this.reLoginPromise = this.login(this.email, this.password);
    try {
      return await this.reLoginPromise;
    } finally {
      this.reLoginPromise = null;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      source: 'ANDROID',
      language: 'EN',
      timezone: this.timezone,
      version: APP_VERSION,
    };
    if (this.token) {
      headers.token = this.token;
    }
    return headers;
  }

  private rawRequest<T>(path: string, body?: Record<string, unknown>): Promise<PetlibroApiResponse<T>> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const payload = body ? JSON.stringify(body) : '';
      const headers = this.getHeaders();
      if (payload) {
        headers['Content-Length'] = String(Buffer.byteLength(payload));
      }

      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: string) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data) as PetlibroApiResponse<T>;
              resolve(parsed);
            } catch (e) {
              reject(new Error(`Failed to parse API response: ${data.substring(0, 200)}`));
            }
          });
        },
      );

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy(new Error('Request timed out'));
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

}
