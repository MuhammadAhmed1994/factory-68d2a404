import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Feature modules import this module to share Nest's PrismaService provider.
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
