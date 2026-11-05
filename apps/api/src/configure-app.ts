import type { INestApplication } from '@nestjs/common';
import { json } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { ENVIRONMENT } from './config/environment.js';
import type { Environment } from './config/environment.js';
import { requestLogging } from './common/request-logging.js';

export function configureApp(app: INestApplication): void {
  const environment = app.get<Environment>(ENVIRONMENT);
  app.use(requestLogging);
  app.use(json({ limit: '64kb' }));
  app.use((error: { type?: string }, _req: Request, res: Response, next: NextFunction) => {
    if (error.type === 'entity.too.large' || error.type === 'entity.parse.failed') {
      res.status(error.type === 'entity.too.large' ? 413 : 400).json({
        errors: [{ message: 'Некорректный JSON-запрос', extensions: { code: 'BAD_USER_INPUT' } }],
      });
      return;
    }
    next(error);
  });
  app.use('/graphql', (req: Request, res: Response, next: NextFunction) => {
    const query: unknown = req.method === 'GET' ? req.query.query : req.body?.query;
    if (typeof query === 'string' && Buffer.byteLength(query) > 64 * 1024) {
      res.status(413).json({
        errors: [{ message: 'Запрос слишком большой', extensions: { code: 'BAD_USER_INPUT' } }],
      });
      return;
    }
    next();
  });
  app.enableCors({
    origin: environment.appOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-App-Request', 'X-CSRF-Token', 'Apollo-Require-Preflight'],
  });
}
