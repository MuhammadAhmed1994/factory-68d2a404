import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketSeverity, TicketStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import type { TicketListQueryDto } from './tickets.dto';

const ticketInclude = {
  customer: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TicketInclude;

export type TicketRecord = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;
export type TicketListFilters = Pick<TicketListQueryDto, 'status' | 'severity' | 'customerId'>;

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, filters: TicketListFilters): Promise<TicketRecord[]> {
    if (user.role === UserRole.CUSTOMER && (filters.severity !== undefined || filters.customerId !== undefined)) {
      throw new BadRequestException('Customers may filter tickets by status only');
    }

    const where: Prisma.TicketWhereInput = {};
    if (user.role === UserRole.CUSTOMER) where.customerId = user.id;
    else if (filters.customerId !== undefined) where.customerId = filters.customerId;
    if (filters.status !== undefined) where.status = filters.status as TicketStatus;
    if (filters.severity !== undefined) where.severity = filters.severity as TicketSeverity;

    return this.prisma.ticket.findMany({
      where,
      include: ticketInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<TicketRecord> {
    const where: Prisma.TicketWhereUniqueInput = { id };
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        ...where,
        ...(user.role === UserRole.CUSTOMER ? { customerId: user.id } : {}),
      },
      include: ticketInclude,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }
}
