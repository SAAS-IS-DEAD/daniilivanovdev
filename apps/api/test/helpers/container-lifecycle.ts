export interface TestDatabaseContainer {
  getConnectionUri(): string;
  getHost(): string;
  getDatabase(): string;
  getId(): string;
  stop(): Promise<unknown>;
}
// Keep ownership in the parent process so failed migrations/tests still release the database.
export async function withTestDatabase<T>(
  start: () => Promise<TestDatabaseContainer>,
  run: (env: NodeJS.ProcessEnv) => Promise<T>,
  baseEnv: NodeJS.ProcessEnv = process.env,
): Promise<T> {
  if (baseEnv.TEST_DATABASE_URL)
    throw new Error('Do not supply TEST_DATABASE_URL; tests create their own container');
  const container = await start();
  try {
    return await run({
      ...baseEnv,
      TEST_DATABASE_URL: container.getConnectionUri(),
      TEST_DATABASE_HOST: container.getHost(),
      TEST_DATABASE_NAME: container.getDatabase(),
      TEST_CONTAINER_ID: container.getId(),
    });
  } finally {
    await container.stop();
  }
}
