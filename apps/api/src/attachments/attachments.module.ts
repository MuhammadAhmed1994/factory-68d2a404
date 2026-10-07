import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { PrivateFileStore } from './private-file-store';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, PrivateFileStore],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
