import { GraphQLError, Kind } from 'graphql';
import type { ValidationRule, FragmentDefinitionNode, SelectionSetNode } from 'graphql';

export const queryLimits: ValidationRule = (context) => ({
  Document(document) {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of document.definitions)
      if (definition.kind === Kind.FRAGMENT_DEFINITION)
        fragments.set(definition.name.value, definition);
    for (const operation of document.definitions) {
      if (operation.kind !== Kind.OPERATION_DEFINITION) continue;
      let visits = 0;
      let fields = 0;
      let depth = 0;
      let maxDepth = 20;
      let maxFields = 2000;
      const rootNames: string[] = [];
      const walk = (
        set: SelectionSetNode,
        level: number,
        rootsOnly: boolean,
        path: Set<string>,
      ) => {
        if (level > maxDepth) throw new Error('depth');
        for (const selection of set.selections) {
          if (++visits > 10000) throw new Error('visits');
          if (selection.kind === Kind.FIELD) {
            if (rootsOnly) {
              rootNames.push(selection.name.value);
              if (rootNames.length > 50) throw new Error('roots');
            } else {
              if (++fields > maxFields) throw new Error('fields');
              depth = Math.max(depth, level);
              if (selection.selectionSet) walk(selection.selectionSet, level + 1, false, path);
            }
          } else if (selection.kind === Kind.INLINE_FRAGMENT)
            walk(selection.selectionSet, level, rootsOnly, path);
          else {
            const name = selection.name.value;
            if (path.has(name)) throw new Error('cycle');
            const fragment = fragments.get(name);
            if (fragment) walk(fragment.selectionSet, level, rootsOnly, new Set([...path, name]));
          }
        }
      };
      try {
        walk(operation.selectionSet, 1, true, new Set());
        const pure =
          operation.operation === 'query' &&
          rootNames.every((n) => ['__schema', '__type', '__typename'].includes(n));
        if (pure && rootNames.length > 3) throw new Error('introspection roots');
        maxDepth = pure ? 20 : 6;
        maxFields = pure ? 2000 : 50;
        visits = 0;
        walk(operation.selectionSet, 1, false, new Set());
        if (depth > (pure ? 20 : 6) || fields > (pure ? 2000 : 50)) throw new Error('budget');
      } catch {
        context.reportError(
          new GraphQLError('Запрос превышает допустимую сложность', {
            nodes: operation,
            extensions: { code: 'BAD_USER_INPUT', reason: 'QUERY_LIMIT' },
          }),
        );
      }
    }
  },
});
