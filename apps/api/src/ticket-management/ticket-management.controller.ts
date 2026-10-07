import { Body, Controller, Delete, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard, AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ChangeTicketStatusDto, EditTicketDto } from './ticket-management.dto';
import { TicketManagementService } from './ticket-management.service';

@Controller('tickets')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TicketManagementController {
  constructor(private readonly ticketManagement: TicketManagementService) {}

  @Patch(':id')
  edit(
    @Param('id') id: string,
    @Body() update: EditTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; title: string; description: string; severity: string; updatedById: string | null; updatedAt: Date }> {
    return this.ticketManagement.editTicket(id, user, update);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() body: ChangeTicketStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; status: string }> {
    return this.ticketManagement.changeStatus(id, user, body);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: true }> {
    await this.ticketManagement.deleteTicket(id, user);
    return { deleted: true };
  }
}
