import { getDirectiveValues, GraphQLIncludeDirective, GraphQLSkipDirective, Kind } from 'graphql';
import type { GraphQLResolveInfo, SelectionSetNode } from 'graphql';
import type { ProfileFields } from '../profile/profile-fields.js';

// Profile and its nested outputs are concrete object types. GraphQL validates
// fragment type conditions before this resolver runs, so all valid spreads apply.
export function selectedProfileFields(info: GraphQLResolveInfo): ProfileFields {
  const result: ProfileFields = {};
  const visit = (set: SelectionSetNode, fields: ProfileFields, seen: Set<string>) => {
    for (const node of set.selections) {
      if (
        getDirectiveValues(GraphQLSkipDirective, node, info.variableValues)?.if === true ||
        getDirectiveValues(GraphQLIncludeDirective, node, info.variableValues)?.if === false
      )
        continue;
      if (node.kind === Kind.FIELD) {
        const name = node.name.value;
        if (name === '__typename') continue;
        const nested = fields[name] ?? {};
        fields[name] = nested;
        if (node.selectionSet) visit(node.selectionSet, nested, new Set());
      } else if (node.kind === Kind.INLINE_FRAGMENT) {
        visit(node.selectionSet, fields, seen);
      } else {
        const name = node.name.value;
        if (seen.has(name)) continue;
        seen.add(name);
        visit(info.fragments[name]!.selectionSet, fields, seen);
      }
    }
  };
  const seen = new Set<string>();
  for (const node of info.fieldNodes) {
    // These are fields of the validated Profile object, always with a selection set.
    visit(node.selectionSet!, result, seen);
  }
  return result;
}
