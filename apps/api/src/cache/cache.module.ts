import { Module } from '@nestjs/common';
import { RedisStore } from './redis.store.js';

@Module({ providers: [RedisStore], exports: [RedisStore] })
export class CacheModule {}
