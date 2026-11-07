import { CacheModule } from '../cache/cache.module.js';
import { Module } from '@nestjs/common';
import { ProfileRepository } from './profile.repository.js';
import { ProfileService } from './profile.service.js';
import { ProfileResolver } from './profile.resolver.js';

@Module({ imports: [CacheModule], providers: [ProfileRepository, ProfileService, ProfileResolver] })
export class ProfileModule {}
