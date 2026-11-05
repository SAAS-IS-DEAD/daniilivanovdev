import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Injectable } from '@nestjs/common';

@Injectable()
class Dependency {}
@Injectable()
class Consumer {
  constructor(readonly dependency: Dependency) {}
}

test('compiled decorators preserve dependency metadata needed by Nest', () => {
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', Consumer), [Dependency]);
});
