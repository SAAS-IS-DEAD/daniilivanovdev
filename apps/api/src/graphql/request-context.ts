import { Logger } from '@nestjs/common';
import type { ApolloServerPlugin } from '@apollo/server';
import type { Response } from 'express';

export interface RequestContext {
  res: Response;
}
const logger = new Logger('GraphQL');
export const requestContextPlugin: ApolloServerPlugin<RequestContext> = {
  async requestDidStart() {
    return {
      async didEncounterErrors({ errors, contextValue }) {
        for (const error of errors) {
          if (!error.extensions.code || error.extensions.code === 'INTERNAL_SERVER_ERROR') {
            const requestId = contextValue.res.locals.requestId as string;
            error.extensions.requestId = requestId;
            logger.error({ requestId, code: 'INTERNAL_SERVER_ERROR' });
          }
        }
      },
    };
  },
};
