import { Module } from '@nestjs/common';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { TicketCreationModule } from './ticket-creation/ticket-creation.module';
import { TicketManagementModule } from './ticket-management/ticket-management.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    AuthModule,
    CustomersModule,
    TicketsModule,
    AttachmentsModule,
    TicketCreationModule,
    TicketManagementModule,
  ],
})
export class AppModule {}
