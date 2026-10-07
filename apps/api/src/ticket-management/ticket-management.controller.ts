import { Body, Controller, Delete, Param, Patch, UseGuards } from '@nestjs/common';
import { TicketStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TicketManagementService, ManagedTicket } from './ticket-management.service';
import { UpdateTicketDto, UpdateTicketStatusDto } from './ticket-management.dto';

@Controller('tickets')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TicketManagementController {
  constructor(private readonly ticketManagementService: TicketManagementService) {}

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() input: UpdateTicketDto,
  ): Promise<ManagedTicket> {
    return this.ticketManagementService.update(id, admin, input);
  }

  @Patch(':id/status')
  async changeStatus(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() input: UpdateTicketStatusDto,
  ): Promise<ManagedTicket> {
    return this.ticketManagementService.changeStatus(id, admin, input.status as TicketStatus);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    return this.ticketManagementService.remove(id);
  }
}
