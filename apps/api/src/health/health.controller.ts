import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly db: PrismaService) {}
  @Get('live')
  live() {
    return { status: 'ok' };
  }
  @Get('ready')
  async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      // biome-ignore lint/style/useErrorCause: Readiness intentionally discards database error details.
      throw new ServiceUnavailableException('Service is not ready');
    }
  }
}
