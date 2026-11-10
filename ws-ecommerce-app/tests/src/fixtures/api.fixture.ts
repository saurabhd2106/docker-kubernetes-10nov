import { test as base } from '@playwright/test';
import { ApiClients } from '../api/clients';
import { env } from '../config/env';
import { uniqueUser, type UniqueUser } from '../data/factories';
import type { AuthUser } from '../api/types';

type ApiFixtures = {
  api: ApiClients;
  demoApi: ApiClients;
  authedApi: ApiClients & { user: AuthUser; credentials: UniqueUser };
};

export const apiTest = base.extend<ApiFixtures>({
  api: async ({ request }, use, testInfo) => {
    await use(new ApiClients(request, null, testInfo));
  },

  demoApi: async ({ request }, use, testInfo) => {
    const clients = new ApiClients(request, null, testInfo);
    const auth = await clients.auth.login({
      username: env.demoUser,
      password: env.demoPassword,
    });
    await use(clients.withToken(auth.token));
  },

  authedApi: async ({ request }, use, testInfo) => {
    const credentials = uniqueUser();
    const clients = new ApiClients(request, null, testInfo);
    const user = await clients.auth.register(credentials);
    const authed = Object.assign(clients.withToken(user.token), { user, credentials });
    await use(authed);
  },
});
