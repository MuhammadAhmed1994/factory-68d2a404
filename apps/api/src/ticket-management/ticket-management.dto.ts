import { TicketSeverity, TicketStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Editable ticket fields accepted by PATCH /tickets/:id. */
export class EditTicketDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(TicketSeverity)
  severity?: TicketSeverity;
}

/** Target status accepted by PATCH /tickets/:id/status. */
export class ChangeTicketStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
