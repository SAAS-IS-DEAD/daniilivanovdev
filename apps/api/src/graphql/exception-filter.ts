import { ArgumentsHost, Catch, Injectable } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { GraphQLError } from 'graphql';

// Nest's default exception handler logs raw errors. Preserve deliberate domain errors,
// but sanitize unexpected resolver failures before either Nest or Apollo can print them.
@Injectable()
@Catch()
export class GraphQLExceptionFilter extends BaseExceptionFilter {
  constructor(adapter: HttpAdapterHost) {
    super(adapter.httpAdapter);
  }
  override catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType<string>() !== 'graphql') return super.catch(exception, host);
    if (exception instanceof GraphQLError) return exception;
    return new GraphQLError('Внутренняя ошибка сервера', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}
