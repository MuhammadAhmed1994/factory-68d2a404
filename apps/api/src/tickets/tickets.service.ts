import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TicketSeverity, TicketStatus, UserRole, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TicketFiltersDto } from './tickets.dto';

export interface TicketAttachmentView {
  id: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedById: string;
  createdAt: Date;
}

export interface TicketCustomerView {
  id: string;
  name: string;
  email: string;
}

export interface TicketView {
  id: string;
  reference: number;
  customerId: string;
  createdById: string;
  updatedById: string | null;
  title: string;
  description: string;
  severity: TicketSeverity;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  customer: TicketCustomerView;
  attachments: TicketAttachmentView[];
}

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTickets(user: AuthenticatedUser, filters: TicketFiltersDto): Promise<TicketView[]> {
    const parsedFilters = await this.validateFilters(filters);
    if (user.role === UserRole.CUSTOMER && (parsedFilters.severity || parsedFilters.customerId)) {
      throw new BadRequestException('Customers may filter tickets only by status');
    }

    const where: Prisma.TicketWhereInput = {};
    if (user.role === UserRole.CUSTOMER) where.customerId = user.id;
    if (parsedFilters.status) where.status = parsedFilters.status;
    if (user.role === UserRole.ADMIN) {
      if (parsedFilters.severity) where.severity = parsedFilters.severity;
      if (parsedFilters.customerId) where.customerId = parsedFilters.customerId;
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            sizeBytes: true,
            mimeType: true,
            uploadedById: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return tickets.map((ticket) => this.toTicketView(ticket));
  }

  async getTicket(user: AuthenticatedUser, id: string): Promise<TicketView> {
    const where: Prisma.TicketWhereUniqueInput = { id };
    const ticket = await this.prisma.ticket.findUnique({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            sizeBytes: true,
            mimeType: true,
            uploadedById: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket || (user.role === UserRole.CUSTOMER && ticket.customerId !== user.id)) {
      throw new NotFoundException('Ticket not found');
    }
    return this.toTicketView(ticket);
  }

  private async validateFilters(filters: TicketFiltersDto): Promise<TicketFiltersDto> {
    const dto = plainToInstance(TicketFiltersDto, filters ?? {});
    const errors = await validate(dto, { groups: ['ticket-filter'], whitelist: true });
    if (errors.length > 0) throw new BadRequestException('Invalid ticket filters');
    return dto;
  }

  private toTicketView(ticket: Prisma.TicketGetPayload<{
    include: {
      customer: { select: { id: true; name: true; email: true } };
      attachments: {
        select: {
          id: true;
          fileName: true;
          sizeBytes: true;
          mimeType: true;
          uploadedById: true;
          createdAt: true;
        };
      };
    };
  }>): TicketView {
    return {
      id: ticket.id,
      reference: ticket.reference,
      customerId: ticket.customerId,
      createdById: ticket.createdById,
      updatedById: ticket.updatedById,
      title: ticket.title,
      description: ticket.description,
      severity: ticket.severity,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      customer: ticket.customer,
      attachments: ticket.attachments.map((attachment) => ({
        ...attachment,
        sizeBytes: Number(attachment.sizeBytes),
      })),
    };
  }
}
