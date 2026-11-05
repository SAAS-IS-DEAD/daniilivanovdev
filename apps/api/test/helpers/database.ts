// Only the Testcontainers runner supplies these values. There is no persistent DB fallback.
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? '';
export function assertTestDatabase(env: NodeJS.ProcessEnv = process.env): void {
  const fail = () => {
    throw new Error('Tests require a database owned by the Testcontainers runner');
  };
  if (
    !env.TEST_DATABASE_URL ||
    !env.TEST_DATABASE_HOST ||
    !/^card_test_[a-f0-9]{16}$/.test(env.TEST_DATABASE_NAME ?? '') ||
    !/^[a-f0-9]{64}$/.test(env.TEST_CONTAINER_ID ?? '')
  )
    return fail();
  let target: URL;
  let live: URL | undefined;
  try {
    target = new URL(env.TEST_DATABASE_URL);
    live = env.DATABASE_URL ? new URL(env.DATABASE_URL) : undefined;
  } catch {
    return fail();
  }
  if (
    !['postgresql:', 'postgres:'].includes(target.protocol) ||
    target.hostname !== env.TEST_DATABASE_HOST ||
    target.pathname !== `/${env.TEST_DATABASE_NAME}` ||
    target.username !== 'card_test' ||
    !target.password ||
    !target.port ||
    target.search ||
    target.hash
  )
    return fail();
  const host = (value: string) =>
    ['localhost', '127.0.0.1', '[::1]'].includes(value) ? 'loopback' : value;
  if (
    live &&
    host(live.hostname) === host(target.hostname) &&
    (live.port || '5432') === target.port &&
    live.pathname === target.pathname
  ) {
    throw new Error('Test database must not be the application database');
  }
}
