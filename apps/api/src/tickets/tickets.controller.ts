import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TicketListQueryDto } from './tickets.dto';
import { TicketRecord, TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(AuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: TicketListQueryDto,
  ): Promise<TicketRecord[]> {
    return this.ticketsService.list(user, filters);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<TicketRecord> {
    return this.ticketsService.findOne(user, id);
  }
}
