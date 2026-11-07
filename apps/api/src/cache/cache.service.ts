import { Injectable } from '@nestjs/common';
import { deserialize, serialize } from 'node:v8';
import { RedisStore } from './redis.store.js';

@Injectable()
export class CacheService {
  private readonly pending = new Map<string, Promise<unknown>>();
  constructor(private readonly store: RedisStore) {}

  async read<T>(key: string, load: () => Promise<T>): Promise<T> {
    let work = this.pending.get(key);
    if (!work) {
      work = this.load(key, load);
      this.pending.set(key, work);
    }
    try {
      // A concurrent caller must not mutate another caller's result.
      return structuredClone(await work) as T;
    } finally {
      if (this.pending.get(key) === work) this.pending.delete(key);
    }
  }

  private async load<T>(key: string, load: () => Promise<T>): Promise<T> {
    try {
      const hit = await this.store.get(key);
      // V8 serialization preserves Prisma Date values and nulls exactly.
      if (hit !== null) return deserialize(Buffer.from(hit, 'base64')) as T;
    } catch {
      // A failed read or corrupt cache entry is a miss, never an API error.
    }
    const value = await load();
    // Missing details must not fill Redis with arbitrary user-supplied UUIDs.
    if (value !== null && value !== undefined) {
      try {
        await this.store.set(key, serialize(value).toString('base64'));
      } catch {
        // A successful database read remains successful if Redis cannot write.
      }
    }
    return value;
  }
}
