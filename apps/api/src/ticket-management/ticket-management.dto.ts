import { TicketSeverity, TicketStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateTicketDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(TicketSeverity)
  severity?: TicketSeverity;
}

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
