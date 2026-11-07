import { Module } from '@nestjs/common';
import { CacheService } from './cache.service.js';
import { RedisStore } from './redis.store.js';

@Module({ providers: [RedisStore, CacheService], exports: [CacheService] })
export class CacheModule {}
