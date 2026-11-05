import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { printSchema, lexicographicSortSchema } from 'graphql';
import { buildSchema } from '../graphql/schema-builder.js';
import { ProfileResolver } from '../profile/profile.resolver.js';

const output = resolve(import.meta.dirname, '../../../..', 'artifacts/schema.graphql');
const schema = await buildSchema([ProfileResolver]);
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, printSchema(lexicographicSortSchema(schema)) + '\n');
console.log('Exported artifacts/schema.graphql');
