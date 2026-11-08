import { ClientError, GraphQLClient } from 'graphql-request';
import { getSdk } from './generated/sdk';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fields: { path: string; message: string }[] = [],
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}
const messages: Record<string, string> = {
  BAD_USER_INPUT: 'Проверьте введённые данные',
  UNAUTHENTICATED: 'Нужно войти в аккаунт',
  FORBIDDEN: 'Доступ запрещён',
  NOT_FOUND: 'Запись не найдена',
  CONFLICT: 'Такая запись уже существует',
  RATE_LIMITED: 'Слишком много попыток. Повторите позже',
  INTERNAL_SERVER_ERROR: 'Не удалось выполнить запрос',
};
function normalizeError(error: unknown): ApiError {
  if (error instanceof ClientError) {
    const extensions = error.response.errors?.[0]?.extensions;
    const rawCode = extensions?.code;
    const code =
      typeof rawCode === 'string' && Object.hasOwn(messages, rawCode)
        ? rawCode
        : 'INTERNAL_SERVER_ERROR';
    const fields = Array.isArray(extensions?.fields)
      ? extensions.fields.filter(
          (f): f is { path: string; message: string } =>
            typeof f?.path === 'string' && typeof f?.message === 'string',
        )
      : [];
    return new ApiError(
      code,
      messages[code] ?? 'Не удалось выполнить запрос',
      fields,
      typeof extensions?.retryAfterSeconds === 'number' ? extensions.retryAfterSeconds : undefined,
    );
  }
  return new ApiError('NETWORK_ERROR', 'Не удалось связаться с сервером');
}
export function createApi(client: GraphQLClient) {
  return getSdk(client, async (action) => {
    try {
      return await action();
    } catch (error) {
      // ClientError contains request variables; never retain it as cause or log it.
      throw normalizeError(error);
    }
  });
}
export const sdk = createApi(
  new GraphQLClient(new URL('/graphql', window.location.origin).href, { credentials: 'omit' }),
);
