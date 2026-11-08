import { GraphQLError } from 'graphql';
import type { GraphQLFormattedError } from 'graphql';

export function badInput(path: string, message: string): never {
  throw new GraphQLError('Проверьте введённые данные', {
    extensions: { code: 'BAD_USER_INPUT', fields: [{ path, message }] },
  });
}
const publicCodes = new Set([
  'BAD_USER_INPUT',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
]);
export function formatError(error: GraphQLFormattedError): GraphQLFormattedError {
  const { fields, retryAfterSeconds, requestId } = error.extensions ?? {};
  const code =
    error.extensions?.reason === 'QUERY_LIMIT' ? 'BAD_USER_INPUT' : error.extensions?.code;
  if (typeof code !== 'string' || !publicCodes.has(code)) {
    return {
      message: 'Внутренняя ошибка сервера',
      extensions: { code: 'INTERNAL_SERVER_ERROR', ...(requestId ? { requestId } : {}) },
    };
  }
  return {
    message: error.message,
    locations: error.locations,
    path: error.path,
    extensions: {
      code,
      ...(fields ? { fields } : {}),
      ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
    },
  };
}
