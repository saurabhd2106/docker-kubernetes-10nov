import { test, expect } from '../../src/fixtures';
import { ApiError } from '../../src/api/types';
import { env } from '../../src/config/env';
import { uniqueUser } from '../../src/data/factories';

test.describe('API auth', () => {
  test('should return a token and username when logging in as the demo user', { tag: '@smoke' }, async ({ api }) => {
    const credentials = await test.step('Input Data: demo username and password', async () => ({
      username: env.demoUser,
      password: env.demoPassword,
    }));

    const auth = await test.step('Action: POST /auth/login with demo credentials', async () => {
      return api.auth.login(credentials);
    });

    await test.step('Validation: response includes token and matching username', async () => {
      expect(auth.token).toBeTruthy();
      expect(auth.username).toBe(env.demoUser);
      expect(auth.displayName).toBeTruthy();
    });
  });

  test('should return UNAUTHORIZED when password is wrong', { tag: '@smoke' }, async ({ api }) => {
    const credentials = await test.step('Input Data: demo username with an invalid password', async () => ({
      username: env.demoUser,
      password: 'definitely-wrong-password',
    }));

    const error = await test.step('Action: POST /auth/login with invalid password', async () => {
      try {
        await api.auth.login(credentials);
        return null;
      } catch (err) {
        return err;
      }
    });

    await test.step('Validation: ApiError is 401 with code UNAUTHORIZED', async () => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(401);
      expect(apiError.code).toBe('UNAUTHORIZED');
      expect(apiError.message).toBe('Invalid username or password');
    });
  });

  test('should return UNAUTHORIZED when username does not exist', { tag: '@regression' }, async ({ api }) => {
    const credentials = await test.step('Input Data: unknown username with any password', async () => ({
      username: `unknown_${Date.now()}`,
      password: 'some-password',
    }));

    const error = await test.step('Action: POST /auth/login with unknown username', async () => {
      try {
        await api.auth.login(credentials);
        return null;
      } catch (err) {
        return err;
      }
    });

    await test.step('Validation: ApiError is 401 with code UNAUTHORIZED and Invalid username or password', async () => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(401);
      expect(apiError.code).toBe('UNAUTHORIZED');
      expect(apiError.message).toBe('Invalid username or password');
    });
  });

  test('should return VALIDATION_ERROR for both fields when username and password are empty', { tag: '@regression' }, async ({ api }) => {
    const credentials = await test.step('Input Data: empty username and password', async () => ({
      username: '',
      password: '',
    }));

    const error = await test.step('Action: POST /auth/login with empty credentials', async () => {
      try {
        await api.auth.login(credentials);
        return null;
      } catch (err) {
        return err;
      }
    });

    await test.step('Validation: ApiError is 400 VALIDATION_ERROR with username and password fields', async () => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(400);
      expect(apiError.code).toBe('VALIDATION_ERROR');
      expect(apiError.fields).toBeDefined();
      expect(apiError.fields?.username).toBeTruthy();
      expect(apiError.fields?.password).toBeTruthy();
    });
  });

  test('should return VALIDATION_ERROR for password when only password is empty', { tag: '@regression' }, async ({ api }) => {
    const credentials = await test.step('Input Data: demo username with empty password', async () => ({
      username: env.demoUser,
      password: '',
    }));

    const error = await test.step('Action: POST /auth/login with empty password', async () => {
      try {
        await api.auth.login(credentials);
        return null;
      } catch (err) {
        return err;
      }
    });

    await test.step('Validation: ApiError is 400 VALIDATION_ERROR with only password field', async () => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(400);
      expect(apiError.code).toBe('VALIDATION_ERROR');
      expect(apiError.fields?.password).toBeTruthy();
      expect(apiError.fields?.username).toBeUndefined();
    });
  });

  test('should return VALIDATION_ERROR for username when only username is empty', { tag: '@regression' }, async ({ api }) => {
    const credentials = await test.step('Input Data: empty username with a password', async () => ({
      username: '',
      password: env.demoPassword,
    }));

    const error = await test.step('Action: POST /auth/login with empty username', async () => {
      try {
        await api.auth.login(credentials);
        return null;
      } catch (err) {
        return err;
      }
    });

    await test.step('Validation: ApiError is 400 VALIDATION_ERROR with only username field', async () => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(400);
      expect(apiError.code).toBe('VALIDATION_ERROR');
      expect(apiError.fields?.username).toBeTruthy();
      expect(apiError.fields?.password).toBeUndefined();
    });
  });

  test('should return VALIDATION_ERROR when password is whitespace only', { tag: '@regression' }, async ({ api }) => {
    const credentials = await test.step('Input Data: demo username with whitespace-only password', async () => ({
      username: env.demoUser,
      password: '   ',
    }));

    const error = await test.step('Action: POST /auth/login with whitespace-only password', async () => {
      try {
        await api.auth.login(credentials);
        return null;
      } catch (err) {
        return err;
      }
    });

    await test.step('Validation: ApiError is 400 VALIDATION_ERROR with password field', async () => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(400);
      expect(apiError.code).toBe('VALIDATION_ERROR');
      expect(apiError.fields?.password).toBeTruthy();
    });
  });

  test('should return a token when username has surrounding whitespace', { tag: '@regression' }, async ({ api }) => {
    const credentials = await test.step('Input Data: demo username with surrounding whitespace', async () => ({
      username: ` ${env.demoUser} `,
      password: env.demoPassword,
    }));

    const auth = await test.step('Action: POST /auth/login with trimmed-around username', async () => {
      return api.auth.login(credentials);
    });

    await test.step('Validation: response includes token and trimmed demo username', async () => {
      expect(auth.token).toBeTruthy();
      expect(auth.username).toBe(env.demoUser);
    });
  });

  test('should register a unique user and reject a duplicate username when registering twice', { tag: '@smoke' }, async ({ api }) => {
    const credentials = await test.step('Input Data: generate a unique user payload', async () => uniqueUser('api_auth'));

    const first = await test.step('Action: register the unique user, then register the same username again', async () => {
      const created = await api.auth.register(credentials);
      let duplicateError: unknown = null;
      try {
        await api.auth.register(credentials);
      } catch (err) {
        duplicateError = err;
      }
      return { created, duplicateError };
    });

    await test.step('Validation: first registration succeeds and duplicate returns 409 USERNAME_TAKEN', async () => {
      expect(first.created.token).toBeTruthy();
      expect(first.created.username).toBe(credentials.username);
      expect(first.duplicateError).toBeInstanceOf(ApiError);
      const apiError = first.duplicateError as ApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.code).toBe('USERNAME_TAKEN');
    });
  });
});
