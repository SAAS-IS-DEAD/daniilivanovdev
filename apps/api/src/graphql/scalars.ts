import { Scalar } from '@nestjs/graphql';
import type { CustomScalar } from '@nestjs/graphql';
import { GraphQLError, Kind } from 'graphql';
import type { ValueNode } from 'graphql';

function dateValue(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new GraphQLError('Date must be YYYY-MM-DD');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new GraphQLError('Invalid calendar date');
  return value;
}
@Scalar('Date')
export class DateScalar implements CustomScalar<string, string | Date> {
  description = 'ISO календарная дата YYYY-MM-DD, без времени.';
  parseValue(value: unknown): string {
    return dateValue(value);
  }
  serialize(value: unknown): string {
    return dateValue(value instanceof Date ? value.toISOString().slice(0, 10) : value);
  }
  parseLiteral(ast: ValueNode): string {
    if (ast.kind !== Kind.STRING) throw new GraphQLError('Date must be a string');
    return dateValue(ast.value);
  }
}
