import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { config } from '../app.config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Resolve the T-1 database setting when Nest creates the provider, not at module load time.
    const databaseUrl = config.databaseUrl;
    super(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {});
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
