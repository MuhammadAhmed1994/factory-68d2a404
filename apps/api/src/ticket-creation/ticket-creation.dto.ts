import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export const TICKET_SEVERITIES = ['Low', 'Medium', 'High'] as const;
export type TicketSeverityInput = (typeof TICKET_SEVERITIES)[number];

export class CreateTicketDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  title!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsIn(TICKET_SEVERITIES)
  severity!: TicketSeverityInput;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerId?: string;
}
