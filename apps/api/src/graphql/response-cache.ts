import { HeaderMap } from '@apollo/server';
import type { ApolloServerPlugin, BaseContext, GraphQLResponse } from '@apollo/server';
import { lexicographicSortSchema, printSchema } from 'graphql';
import type { RedisStore } from '../cache/redis.store.js';
import { digest, isPublicQuery, responseCacheKey } from './response-cache-key.js';

export const MAX_RESPONSE_BYTES = 256 * 1024;
type Store = Pick<RedisStore, 'get' | 'set'>;
type Entry = { expiresAt: number; data: Record<string, unknown> };
type Flight = {
  promise: Promise<string | null>;
  resolve: (entry: string | null) => void;
  timer: ReturnType<typeof setTimeout>;
};
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const validData = (value: unknown): value is Record<string, unknown> =>
  record(value) && Object.values(value).every((root) => root !== null);
const response = (entry: Entry): GraphQLResponse => ({
  http: { headers: new HeaderMap() },
  body: { kind: 'single', singleResult: { data: entry.data } },
});

export function createResponseCachePlugin(
  store: Store,
  ttlSeconds: number,
  now: () => number = Date.now,
): ApolloServerPlugin<BaseContext> {
  let namespace: string;
  const pending = new Map<string, Flight>();
  const finish = (key: string, flight: Flight, entry: string | null) => {
    clearTimeout(flight.timer);
    if (pending.get(key) === flight) pending.delete(key);
    flight.resolve(entry);
  };
  const decode = (encoded: string | null): Entry | null => {
    if (encoded === null || Buffer.byteLength(encoded) > MAX_RESPONSE_BYTES) return null;
    try {
      const entry: unknown = JSON.parse(encoded);
      return record(entry) &&
        typeof entry.expiresAt === 'number' &&
        entry.expiresAt > now() &&
        entry.expiresAt <= now() + ttlSeconds * 1000 &&
        validData(entry.data)
        ? (entry as Entry)
        : null;
    } catch {
      return null;
    }
  };
  return {
    async serverWillStart() {
      return {
        schemaDidLoadOrUpdate({ apiSchema }) {
          namespace = `${digest(printSchema(lexicographicSortSchema(apiSchema)))}:${ttlSeconds}`;
        },
        async serverWillStop() {
          for (const [key, flight] of pending) finish(key, flight, null);
        },
      };
    },
    async requestDidStart() {
      const expiresAt = now() + ttlSeconds * 1000;
      let key: string | undefined;
      let owner: Flight | undefined;
      return {
        async responseForOperation(context) {
          // Apollo also invokes this hook for unresolved operationName requests.
          if (!context.operation) return null;
          if (!isPublicQuery(context.document, context.operation)) return null;
          key = responseCacheKey(
            context.schema,
            context.document,
            context.operation,
            context.request.variables ?? {},
            namespace,
          );
          if (!key) return null;
          try {
            const entry = decode(await store.get(key));
            if (entry) return response(entry);
          } catch {
            // A corrupt entry or unavailable Redis is a miss.
          }
          const existing = pending.get(key);
          if (existing) {
            const entry = decode(await existing.promise);
            if (entry) return response(entry);
            // Errors are executed per request so request IDs/errors are never shared.
            return null;
          }
          let resolve!: Flight['resolve'];
          const promise = new Promise<string | null>((done) => {
            resolve = done;
          });
          const flight: Flight = {
            promise,
            resolve,
            // A disconnected/hung owner cannot retain a key or block followers forever.
            timer: setTimeout(() => finish(key!, flight, null), 5000),
          };
          flight.timer.unref();
          owner = flight;
          pending.set(key, flight);
          return null;
        },
        async didEncounterErrors() {
          if (key && owner) finish(key, owner, null);
        },
        async willSendResponse(context) {
          if (!key || !owner) return;
          let encoded: string | null = null;
          try {
            const body = context.response.body;
            if (
              (context.response.http.status ?? 200) === 200 &&
              body?.kind === 'single' &&
              !body.singleResult.errors?.length &&
              validData(body.singleResult.data) &&
              expiresAt > now()
            ) {
              const candidate: Entry = { expiresAt, data: body.singleResult.data };
              const serialized = JSON.stringify(candidate);
              if (Buffer.byteLength(serialized) <= MAX_RESPONSE_BYTES) {
                encoded = serialized;
                // One freshness deadline, measured before execution. Hits never extend it.
                await store.set(key, encoded, expiresAt);
              }
            }
          } catch {
            // Successful execution still succeeds when Redis cannot store the response.
          } finally {
            finish(key, owner, encoded);
          }
        },
      };
    },
  };
}
