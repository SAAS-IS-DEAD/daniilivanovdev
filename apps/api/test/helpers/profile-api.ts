import { Module } from '@nestjs/common';
import { ApiGraphQLModule } from '../../src/graphql/graphql.module.js';
import { ProfileModule } from '../../src/profile/profile.module.js';

@Module({ imports: [ApiGraphQLModule, ProfileModule] })
export class ProfileApiTestModule {}
