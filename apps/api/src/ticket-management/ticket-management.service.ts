import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TicketSeverity, TicketStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PrivateFileStore } from '../attachments/private-file-store';
import { ChangeTicketStatusDto, EditTicketDto } from './ticket-management.dto';

export interface EditedTicketResult {
  id: string;
  title: string;
  description: string;
  severity: TicketSeverity;
  updatedById: string | null;
  updatedAt: Date;
}

export interface ChangedTicketStatusResult {
  id: string;
  status: TicketStatus;
}

@Injectable()
export class TicketManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStore: PrivateFileStore,
  ) {}

  async editTicket(
    id: string,
    user: AuthenticatedUser,
    update: EditTicketDto,
  ): Promise<EditedTicketResult> {
    this.assertAdmin(user);
    const data: {
      title?: string;
      description?: string;
      severity?: TicketSeverity;
      updatedById: string;
      updatedAt: Date;
    } = { updatedById: user.id, updatedAt: new Date() };
    if (update.title !== undefined) data.title = update.title;
    if (update.description !== undefined) data.description = update.description;
    if (update.severity !== undefined) data.severity = update.severity;
    if (Object.keys(update).length === 0) {
      throw new UnprocessableEntityException('At least one ticket field must be supplied');
    }

    try {
      return await this.prisma.ticket.update({
        where: { id },
        data,
        select: {
          id: true,
          title: true,
          description: true,
          severity: true,
          updatedById: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (this.isRecordNotFound(error)) throw new NotFoundException('Ticket not found');
      throw error;
    }
  }

  async changeStatus(
    id: string,
    user: AuthenticatedUser,
    body: ChangeTicketStatusDto,
  ): Promise<ChangedTicketStatusResult> {
    this.assertAdmin(user);
    return this.prisma.$transaction(async (transaction) => {
      const ticket = await transaction.ticket.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!ticket) throw new NotFoundException('Ticket not found');
      if (!this.isAllowedTransition(ticket.status, body.status)) {
        throw new BadRequestException(`Ticket cannot transition from ${ticket.status} to ${body.status}`);
      }

      const changedAt = new Date();
      const updated = await transaction.ticket.updateMany({
        where: { id, status: ticket.status },
        data: { status: body.status, updatedAt: changedAt },
      });
      if (updated.count !== 1) {
        throw new BadRequestException('Ticket status changed concurrently; retry the transition');
      }
      await transaction.ticketStatusChange.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: body.status,
          changedById: user.id,
          createdAt: changedAt,
          updatedAt: changedAt,
        },
      });
      return { id, status: body.status };
    });
  }

  async deleteTicket(id: string, user: AuthenticatedUser): Promise<void> {
    this.assertAdmin(user);
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, attachments: { select: { storageKey: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const deleted = await this.prisma.ticket.deleteMany({ where: { id } });
    if (deleted.count !== 1) throw new NotFoundException('Ticket not found');

    // Database cascades remove attachment and status-history records. Remove private object bytes
    // only after the ticket deletion commits, so a failed database operation cannot orphan records.
    await Promise.all(ticket.attachments.map(({ storageKey }) => this.fileStore.remove(storageKey)));
  }

  private assertAdmin(user: AuthenticatedUser): void {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException();
  }

  private isAllowedTransition(from: TicketStatus, to: TicketStatus): boolean {
    return (
      (from === TicketStatus.NEW && to === TicketStatus.IN_PROGRESS) ||
      (from === TicketStatus.IN_PROGRESS && to === TicketStatus.RESOLVED) ||
      (from === TicketStatus.RESOLVED && to === TicketStatus.IN_PROGRESS) ||
      (from === TicketStatus.RESOLVED && to === TicketStatus.CLOSED)
    );
  }

  private isRecordNotFound(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
  }
}
