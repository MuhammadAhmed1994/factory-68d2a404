import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { PrivateFileStore } from './private-file-store';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, PrivateFileStore, AuthGuard, RolesGuard],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
