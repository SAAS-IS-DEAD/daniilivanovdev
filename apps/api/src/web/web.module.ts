import { Inject, Module } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { NestModule } from '@nestjs/common';
import { static as serveStatic } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { relative, resolve } from 'node:path';
import { staticCacheControl } from './static-cache-policy.js';
import { existsSync } from 'node:fs';

export const WEB_ROOT = Symbol('WEB_ROOT');

@Module({
  providers: [{ provide: WEB_ROOT, useValue: resolve(import.meta.dirname, '../../../web/dist') }],
})
export class WebModule implements NestModule {
  constructor(
    private readonly adapter: HttpAdapterHost,
    @Inject(WEB_ROOT) private readonly webRoot: string,
  ) {}
  configure() {
    const webRoot = this.webRoot;
    const staticFiles = serveStatic(webRoot, {
      index: false,
      setHeaders: (res, path) => {
        res.setHeader('Cache-Control', staticCacheControl(relative(webRoot, path)));
      },
    });
    this.adapter.httpAdapter.use((req: Request, res: Response, next: NextFunction) => {
      if (/^\/(graphql|health)(\/|$)/.test(req.path) || !['GET', 'HEAD'].includes(req.method))
        return next();
      staticFiles(req, res, (error: unknown) => {
        if (error) return next(error);
        if (
          !req.accepts('html') ||
          req.path.startsWith('/assets/') ||
          !existsSync(resolve(webRoot, 'index.html'))
        )
          return next();
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(resolve(webRoot, 'index.html'));
      });
    });
  }
}
