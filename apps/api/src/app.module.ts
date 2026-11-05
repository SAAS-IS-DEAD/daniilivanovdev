import { WebModule } from './web/web.module.js';
import { ApiGraphQLModule } from './graphql/graphql.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { Module } from '@nestjs/common';
import { EnvironmentModule } from './config/environment.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    WebModule,
    EnvironmentModule,
    PrismaModule,
    HealthModule,
    ApiGraphQLModule,
    ProfileModule,
  ],
})
export class AppModule {}
