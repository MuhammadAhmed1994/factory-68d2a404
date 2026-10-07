import { BadRequestException } from '@nestjs/common';
import { TicketSeverity, TicketStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

function enumFilter<T extends string>(allowed: readonly T[]): (value: unknown) => T | undefined {
  return (value: unknown): T | undefined => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
      throw new BadRequestException('Invalid ticket filter');
    }
    return value as T;
  };
}

const statusValues = Object.values(TicketStatus);
const severityValues = Object.values(TicketSeverity);

export class TicketListQueryDto {
  @IsOptional()
  @Transform(({ value }) => enumFilter(statusValues)(value))
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @Transform(({ value }) => enumFilter(severityValues)(value))
  @IsEnum(TicketSeverity)
  severity?: TicketSeverity;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException('Invalid customerId filter');
    }
    return value.trim();
  })
  @IsString()
  @MinLength(1)
  customerId?: string;
}
