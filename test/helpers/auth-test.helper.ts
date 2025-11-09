import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthService } from '../../src/auth/auth.service';

/**
 * Helper function to get a valid authentication token for testing.
 * This function performs a login request and returns the access token.
 *
 * @param app - The NestJS application instance
 * @param email - User email for login
 * @param password - User password for login
 * @returns Promise that resolves to the access token string
 * @throws Error if login fails
 *
 * @example
 * ```typescript
 * const token = await getAuthToken(app, 'user@example.com', 'password123');
 * ```
 */
export async function getAuthToken(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);
  return response.body.accessToken;
}

/**
 * Helper function to get a valid authentication token using AuthService directly.
 * This is more efficient for unit tests as it doesn't require HTTP requests.
 *
 * @param module - The NestJS testing module
 * @param email - User email for login
 * @param password - User password for login
 * @returns Promise that resolves to the access token string
 * @throws Error if login fails
 *
 * @example
 * ```typescript
 * const token = await getAuthTokenFromService(module, 'user@example.com', 'password123');
 * ```
 */
export async function getAuthTokenFromService(
  module: TestingModule,
  email: string,
  password: string,
): Promise<string> {
  const authService = module.get<AuthService>(AuthService);
  const loginResult = await authService.login({ email, password });
  return loginResult.accessToken;
}

