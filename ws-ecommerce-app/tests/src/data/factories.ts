export type UniqueUser = {
  username: string;
  password: string;
  displayName: string;
};

/** Builds a unique user for tests that mutate cart/order state. */
export function uniqueUser(prefix = 'qa'): UniqueUser {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    username: `${prefix}_${suffix}`.slice(0, 50),
    password: 'Password1!',
    displayName: `QA ${suffix}`,
  };
}
