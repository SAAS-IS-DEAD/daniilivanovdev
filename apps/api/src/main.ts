import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ENVIRONMENT } from './config/environment.js';
import type { Environment } from './config/environment.js';
import { configureApp } from './configure-app.js';

const app = await NestFactory.create(AppModule, { bodyParser: false });
configureApp(app);
app.enableShutdownHooks();
const environment = app.get<Environment>(ENVIRONMENT);
await app.listen(environment.port, '0.0.0.0');
