import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AttachmentsModule } from '../attachments/attachments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketCreationController } from './ticket-creation.controller';
import { TicketCreationService } from './ticket-creation.service';

@Module({
  imports: [PrismaModule, AttachmentsModule],
  controllers: [TicketCreationController],
  providers: [TicketCreationService, AuthGuard],
  exports: [TicketCreationService],
})
export class TicketCreationModule {}
