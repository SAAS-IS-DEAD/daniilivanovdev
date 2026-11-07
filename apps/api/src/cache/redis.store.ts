import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { ENVIRONMENT, type Environment } from '../config/environment.js';

export const CACHE_PREFIX = 'card:public:v1:';

@Injectable()
export class RedisStore implements OnModuleInit, OnModuleDestroy {
  private readonly client;
  private readonly logger = new Logger(RedisStore.name);
  private warned = false;

  constructor(@Inject(ENVIRONMENT) private readonly environment: Environment) {
    if (environment.redisUrl) {
      this.client = createClient({
        url: environment.redisUrl,
        disableOfflineQueue: true,
        commandsQueueMaxLength: 1000,
        socket: { connectTimeout: 500, reconnectStrategy: () => 1000 },
      });
      this.client.on('error', () => {
        if (!this.warned) this.logger.warn('Redis unavailable; public reads use PostgreSQL');
        this.warned = true;
      });
      this.client.on('ready', () => {
        this.warned = false;
      });
    }
  }

  onModuleInit() {
    // Cache availability must not hold application startup/readiness hostage.
    void this.client?.connect().catch(() => undefined);
  }

  async get(key: string): Promise<string | null> {
    if (!this.client?.isReady) return null;
    return this.bounded(
      this.client.withAbortSignal(AbortSignal.timeout(100)).get(CACHE_PREFIX + key),
    );
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.client?.isReady) return;
    await this.bounded(
      this.client.withAbortSignal(AbortSignal.timeout(100)).set(CACHE_PREFIX + key, value, {
        // A delayed command must not give an old snapshot a new TTL after recovery.
        PXAT: Date.now() + this.environment.cacheTtlSeconds * 1000,
      }),
    );
  }

  private async bounded<T>(command: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // AbortSignal only cancels commands still queued by the client. Bound the
      // caller separately when a command has already been sent to a stalled Redis.
      return await Promise.race([
        command,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Redis command deadline exceeded')), 100);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  onModuleDestroy() {
    // Do not wait for reconnect/queued commands when terminating a pod.
    if (this.client?.isOpen) this.client.destroy();
  }
}
