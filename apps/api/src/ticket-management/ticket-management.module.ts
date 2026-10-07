import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrivateFileStore } from '../attachments/private-file-store';
import { TicketManagementController } from './ticket-management.controller';
import { TicketManagementService } from './ticket-management.service';

@Module({
  imports: [PrismaModule],
  controllers: [TicketManagementController],
  providers: [TicketManagementService, PrivateFileStore, AuthGuard, RolesGuard],
  exports: [TicketManagementService],
})
export class TicketManagementModule {}
