import { isIP } from 'node:net';
import { Global, Module } from '@nestjs/common';

export interface Environment {
  databaseUrl: string;
  appOrigin: string;
  port: number;
  production: boolean;
  authRateKey: string;
  clientIpMode: 'direct' | 'trusted-proxy';
  trustedProxyCidrs: string[];
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
  const authRateKey = source.AUTH_RATE_KEY ?? '';
  if (authRateKey.length < 32) fail('AUTH_RATE_KEY');
  const clientIpMode = source.CLIENT_IP_MODE ?? 'direct';
  if (clientIpMode !== 'direct' && clientIpMode !== 'trusted-proxy') fail('CLIENT_IP_MODE');
  const trustedProxyCidrs = (source.TRUSTED_PROXY_CIDRS ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (clientIpMode === 'trusted-proxy' && trustedProxyCidrs.length === 0)
    fail('TRUSTED_PROXY_CIDRS');
  for (const entry of trustedProxyCidrs) {
    const [ip, prefix, extra] = entry.split('/');
    const family = isIP(ip ?? '');
    if (!family || extra !== undefined) fail('TRUSTED_PROXY_CIDRS');
    if (
      prefix !== undefined &&
      (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > (family === 4 ? 32 : 128))
    )
      fail('TRUSTED_PROXY_CIDRS');
  }
  return {
    databaseUrl,
    appOrigin,
    port,
    production,
    authRateKey,
    clientIpMode: clientIpMode as Environment['clientIpMode'],
    trustedProxyCidrs,
  };
}

@Global()
@Module({
  providers: [{ provide: ENVIRONMENT, useFactory: () => loadEnvironment() }],
  exports: [ENVIRONMENT],
})
export class EnvironmentModule {}
