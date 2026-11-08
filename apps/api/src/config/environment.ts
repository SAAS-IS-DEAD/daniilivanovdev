import { Global, Module } from '@nestjs/common';

export interface Environment {
  databaseUrl: string;
  redisUrl?: string;
  cacheTtlSeconds: number;
  appOrigin: string;
  port: number;
}
export const ENVIRONMENT = Symbol('ENVIRONMENT');

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const fail = (name: string): never => {
    throw new Error(`Invalid or missing configuration: ${name}`);
  };
  const databaseUrl = source.DATABASE_URL ?? '';
  try {
    if (!['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol)) fail('DATABASE_URL');
  } catch {
    fail('DATABASE_URL');
  }
  const redisUrl = source.REDIS_URL || undefined;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      if (
        !['redis:', 'rediss:'].includes(url.protocol) ||
        !url.hostname ||
        !/^\/(?:\d+)?$/.test(url.pathname || '/') ||
        url.search ||
        url.hash
      )
        fail('REDIS_URL');
    } catch {
      fail('REDIS_URL');
    }
  }
  const cacheTtlSeconds = Number(source.CACHE_TTL_SECONDS ?? 60);
  if (!Number.isInteger(cacheTtlSeconds) || cacheTtlSeconds < 1 || cacheTtlSeconds > 3600)
    fail('CACHE_TTL_SECONDS');
  const mode = source.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(mode)) fail('NODE_ENV');
  const production = mode === 'production';
  const appOrigin = source.APP_ORIGIN ?? '';
  try {
    const url = new URL(appOrigin);
    if (
      url.origin !== appOrigin ||
      !['http:', 'https:'].includes(url.protocol) ||
      (production && url.protocol !== 'https:')
    )
      fail('APP_ORIGIN');
  } catch {
    fail('APP_ORIGIN');
  }
  const port = Number(source.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail('PORT');
  return {
    databaseUrl,
    redisUrl,
    cacheTtlSeconds,
    appOrigin,
    port,
  };
}

@Global()
@Module({
  providers: [{ provide: ENVIRONMENT, useFactory: () => loadEnvironment() }],
  exports: [ENVIRONMENT],
})
export class EnvironmentModule {}
