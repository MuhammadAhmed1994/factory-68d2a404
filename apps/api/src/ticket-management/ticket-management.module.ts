import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrivateFileStore } from '../attachments/private-file-store';
import { TicketManagementController } from './ticket-management.controller';
import { TicketManagementService } from './ticket-management.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TicketManagementController],
  providers: [TicketManagementService, PrivateFileStore],
  exports: [TicketManagementService],
})
export class TicketManagementModule {}
