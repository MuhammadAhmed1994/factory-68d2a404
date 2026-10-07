import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TicketFiltersDto } from './tickets.dto';
import { TicketView, TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(AuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: TicketFiltersDto,
  ): Promise<TicketView[]> {
    return this.ticketsService.listTickets(user, filters);
  }

  @Get(':id')
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<TicketView> {
    return this.ticketsService.getTicket(user, id);
  }
}
