import { CacheModule } from '../cache/cache.module.js';
import { RedisStore } from '../cache/redis.store.js';
import { ENVIRONMENT, type Environment } from '../config/environment.js';
import { createResponseCachePlugin } from './response-cache.js';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLExceptionFilter } from './exception-filter.js';
import type { Request, Response } from 'express';
import { requestContextPlugin } from './request-context.js';
import { queryLimits } from './query-limits.js';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { formatError } from '../common/errors.js';
import { DateScalar } from './scalars.js';

@Module({
  imports: [
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      imports: [CacheModule],
      inject: [RedisStore, ENVIRONMENT],
      useFactory: (store: RedisStore, environment: Environment) => ({
        autoSchemaFile: true,
        context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
        sortSchema: true,
        validationRules: [queryLimits],
        graphiql: false,
        introspection: true,
        csrfPrevention: true,
        allowBatchedHttpRequests: false,
        includeStacktraceInErrorResponses: false,
        plugins: [
          ApolloServerPluginLandingPageLocalDefault({ embed: true }),
          requestContextPlugin,
          createResponseCachePlugin(store, environment.cacheTtlSeconds),
        ],
        formatError,
      }),
    }),
  ],
  providers: [DateScalar, { provide: APP_FILTER, useClass: GraphQLExceptionFilter }],
})
export class ApiGraphQLModule {}
