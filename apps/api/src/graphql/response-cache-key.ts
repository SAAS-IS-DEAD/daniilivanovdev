import { createHash } from 'node:crypto';
import { getVariableValues, Kind, print, stripIgnoredCharacters } from 'graphql';
import type {
  DocumentNode,
  GraphQLSchema,
  OperationDefinitionNode,
  SelectionSetNode,
} from 'graphql';

const documents = new WeakMap<DocumentNode, string>();
const publicFields = new Set([
  'profile',
  'skills',
  'skill',
  'experience',
  'experienceItem',
  'projects',
  'project',
]);
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');

function canonical(value: unknown): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-JSON variable');
    if (Object.is(value, -0)) return '-0';
  }
  if (value === null || typeof value !== 'object') {
    const result = JSON.stringify(value);
    if (result === undefined) throw new Error('Non-JSON variable');
    return result;
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error('Non-JSON variable');
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}

export function responseCacheKey(
  schema: GraphQLSchema,
  document: DocumentNode,
  operation: OperationDefinitionNode,
  variables: Record<string, unknown>,
  namespace: string,
): string | undefined {
  const values = getVariableValues(schema, operation.variableDefinitions ?? [], variables);
  if (values.errors) return undefined;
  try {
    let normalized = documents.get(document);
    if (!normalized) {
      normalized = digest(stripIgnoredCharacters(print(document)));
      documents.set(document, normalized);
    }
    return `response:v1:${namespace}:${digest(JSON.stringify([normalized, operation.name?.value ?? null, canonical(values.coerced)]))}`;
  } catch {
    // Custom scalars that produce non-JSON values must execute normally.
    return undefined;
  }
}

export function isPublicQuery(document: DocumentNode, operation: OperationDefinitionNode): boolean {
  if (operation.operation !== 'query') return false;
  const fragments = new Map(
    document.definitions.flatMap((definition) =>
      definition.kind === Kind.FRAGMENT_DEFINITION
        ? [[definition.name.value, definition] as const]
        : [],
    ),
  );
  const walk = (set: SelectionSetNode, path: Set<string>): boolean =>
    set.selections.every((selection) => {
      if (selection.kind === Kind.FIELD) return publicFields.has(selection.name.value);
      if (selection.kind === Kind.INLINE_FRAGMENT) return walk(selection.selectionSet, path);
      const name = selection.name.value;
      const fragment = fragments.get(name);
      return !!fragment && !path.has(name) && walk(fragment.selectionSet, new Set([...path, name]));
    });
  return walk(operation.selectionSet, new Set());
}
