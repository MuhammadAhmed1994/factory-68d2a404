import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export const TICKET_CREATION_SEVERITIES = ['Low', 'Medium', 'High'] as const;
export type TicketCreationSeverity = (typeof TICKET_CREATION_SEVERITIES)[number];

/** Request fields accepted by POST /tickets. Validation is performed by TicketCreationService
 * so this endpoint can return the specified 400 response with invalid field names. */
export class TicketCreationDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  description!: string;

  @IsIn(TICKET_CREATION_SEVERITIES)
  severity!: TicketCreationSeverity;

  // Customers may send this field, but the service always derives ownership from the session.
  @IsOptional()
  @IsString()
  customerId?: string;
}
