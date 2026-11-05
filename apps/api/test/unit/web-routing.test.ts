import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HttpAdapterHost } from '@nestjs/core';
import type { Request, Response, NextFunction } from 'express';
import { WebModule } from '../../src/web/web.module.js';
test('web router delegates API and unsafe methods before attempting static files', () => {
  let handler: (req: Request, res: Response, next: NextFunction) => void = () => {
    throw new Error('Not registered');
  };
  const adapter = {
    httpAdapter: {
      use: (fn: typeof handler) => {
        handler = fn;
      },
    },
  } as unknown as HttpAdapterHost;
  new WebModule(adapter, '/nonexistent-test-root').configure();
  for (const [path, method] of [
    ['/graphql', 'GET'],
    ['/health/ready', 'GET'],
    ['/', 'POST'],
    ['/', 'DELETE'],
  ]) {
    let delegated = false;
    handler({ path, method } as Request, {} as Response, () => {
      delegated = true;
    });
    assert.equal(delegated, true);
  }
});
