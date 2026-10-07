import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PrivateFileStore } from '../attachments/private-file-store';
import type { UpdateTicketDto } from './ticket-management.dto';

export type ManagedTicket = Prisma.TicketGetPayload<{}>;

const allowedTransitions: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  [TicketStatus.NEW]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: [],
};

@Injectable()
export class TicketManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStore: PrivateFileStore,
  ) {}

  async update(id: string, admin: AuthenticatedUser, input: UpdateTicketDto): Promise<ManagedTicket> {
    const data: Prisma.TicketUncheckedUpdateInput = {
      updatedAt: new Date(),
      updatedById: admin.id,
    };
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.severity !== undefined) data.severity = input.severity;
    if (input.title === undefined && input.description === undefined && input.severity === undefined) {
      throw new BadRequestException('At least one ticket field must be provided');
    }

    try {
      return await this.prisma.ticket.update({ where: { id }, data });
    } catch (error) {
      if (this.isRecordNotFound(error)) throw new NotFoundException('Ticket not found');
      throw error;
    }
  }

  async changeStatus(id: string, admin: AuthenticatedUser, status: TicketStatus): Promise<ManagedTicket> {
    return this.prisma.$transaction(async (transaction) => {
      const ticket = await transaction.ticket.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!ticket) throw new NotFoundException('Ticket not found');
      if (!allowedTransitions[ticket.status].includes(status)) {
        throw new BadRequestException(`Status transition from ${ticket.status} to ${status} is not allowed`);
      }

      const changedAt = new Date();
      const updated = await transaction.ticket.update({
        where: { id },
        data: { status, updatedAt: changedAt },
      });
      await transaction.ticketStatusChange.create({
        data: {
          ticketId: id,
          changedById: admin.id,
          fromStatus: ticket.status,
          toStatus: status,
          createdAt: changedAt,
          updatedAt: changedAt,
        },
      });
      return updated;
    });
  }

  async remove(id: string): Promise<{ success: true }> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, attachments: { select: { storageKey: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    await Promise.all(ticket.attachments.map(({ storageKey }) => this.fileStore.remove(storageKey)));
    try {
      await this.prisma.ticket.delete({ where: { id } });
    } catch (error) {
      if (this.isRecordNotFound(error)) throw new NotFoundException('Ticket not found');
      throw error;
    }
    return { success: true };
  }

  private isRecordNotFound(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }
}
