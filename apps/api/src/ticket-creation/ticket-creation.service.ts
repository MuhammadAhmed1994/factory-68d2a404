import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TicketSeverity, TicketStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { AttachmentsService, AttachmentMetadata, IncomingAttachmentFile } from '../attachments/attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './ticket-creation.dto';

const creationTicketInclude = {
  customer: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TicketInclude;

export type CreatedTicketRecord = Prisma.TicketGetPayload<{
  include: typeof creationTicketInclude;
}>;

export interface TicketCreationResult extends CreatedTicketRecord {
  attachments: AttachmentMetadata[];
}

const severityMap: Record<CreateTicketDto['severity'], TicketSeverity> = {
  Low: TicketSeverity.LOW,
  Medium: TicketSeverity.MEDIUM,
  High: TicketSeverity.HIGH,
};

@Injectable()
export class TicketCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  async create(
    user: AuthenticatedUser,
    input: CreateTicketDto,
    files: IncomingAttachmentFile[] = [],
  ): Promise<TicketCreationResult> {
    const customerId = user.role === UserRole.CUSTOMER
      ? user.id
      : input.customerId;

    if (!customerId) {
      throw new BadRequestException({
        message: 'A customerId is required to create a ticket as an admin',
        field: 'customerId',
      });
    }

    const customer = await this.prisma.user.findFirst({
      where: { id: customerId, role: UserRole.CUSTOMER },
      select: { id: true },
    });
    if (!customer) {
      throw new BadRequestException({
        message: 'customerId must identify a customer account',
        field: 'customerId',
      });
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        customerId: customer.id,
        createdById: user.id,
        title: input.title,
        description: input.description,
        severity: severityMap[input.severity],
        status: TicketStatus.NEW,
      },
      include: creationTicketInclude,
    });

    const attachments: AttachmentMetadata[] = [];
    for (const file of files) {
      attachments.push(await this.attachmentsService.upload(ticket.id, user, file));
    }

    return { ...ticket, attachments };
  }
}
