import { Allow, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { TicketSeverity, TicketStatus } from '@prisma/client';

/** Query filters accepted by GET /tickets. TicketsService validates the ticket-filter group as a 400. */
export class TicketFiltersDto {
  @Allow()
  @IsOptional({ groups: ['ticket-filter'] })
  @IsEnum(TicketStatus, { groups: ['ticket-filter'] })
  status?: TicketStatus;

  @Allow()
  @IsOptional({ groups: ['ticket-filter'] })
  @IsEnum(TicketSeverity, { groups: ['ticket-filter'] })
  severity?: TicketSeverity;

  @Allow()
  @IsOptional({ groups: ['ticket-filter'] })
  @IsString({ groups: ['ticket-filter'] })
  @Matches(/^.{1,64}$/, { groups: ['ticket-filter'] })
  customerId?: string;
}
