import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketCreationController } from './ticket-creation.controller';
import { TicketCreationService } from './ticket-creation.service';

@Module({
  imports: [AttachmentsModule, AuthModule, PrismaModule],
  controllers: [TicketCreationController],
  providers: [TicketCreationService],
  exports: [TicketCreationService],
})
export class TicketCreationModule {}
