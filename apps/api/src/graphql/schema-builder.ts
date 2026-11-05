import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { DateScalar } from './scalars.js';

// Deliberately excludes AppModule: exporting the contract must not connect to PostgreSQL.
export async function buildSchema(resolvers: Parameters<GraphQLSchemaFactory['create']>[0]) {
  const context = await NestFactory.createApplicationContext(GraphQLSchemaBuilderModule, {
    logger: false,
  });
  try {
    return await context.get(GraphQLSchemaFactory).create(resolvers, [DateScalar]);
  } finally {
    await context.close();
  }
}
