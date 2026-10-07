import { BadRequestException, Injectable } from '@nestjs/common';
import { TicketSeverity, TicketStatus, UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import type { AuthenticatedUser } from '../auth/auth.guard';
import {
  AttachmentMetadata,
  AttachmentsService,
  UploadedAttachmentFile,
} from '../attachments/attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketCreationDto, TicketCreationSeverity } from './ticket-creation.dto';
import type { TicketCreationUploadedFiles } from './ticket-creation.controller';

export interface TicketCreationAttachmentView {
  id: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedById: string;
  createdAt: Date;
}

export interface TicketCreationCustomerView {
  id: string;
  name: string;
  email: string;
}

export interface TicketCreationResult {
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
  customer: TicketCreationCustomerView;
  attachments: TicketCreationAttachmentView[];
}

const SEVERITY_MAP: Record<TicketCreationSeverity, TicketSeverity> = {
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

  async createTicket(
    user: AuthenticatedUser,
    body: unknown,
    files?: TicketCreationUploadedFiles,
  ): Promise<TicketCreationResult> {
    const dto = await this.validateRequest(body);
    let customerId: string;

    if (user.role === UserRole.CUSTOMER) {
      // Ignore any submitted customerId: ownership always comes from authentication.
      customerId = user.id;
    } else if (user.role === UserRole.ADMIN) {
      customerId = await this.requireCustomer(dto.customerId);
    } else {
      throw new BadRequestException({ message: 'Invalid submission', fields: { role: ['invalid'] } });
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        customerId,
        createdById: user.id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        severity: SEVERITY_MAP[dto.severity],
        // The database default is New; omit reference so the unique autoincrement is assigned.
      },
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
        },
      },
    });

    const uploaded: AttachmentMetadata[] = [];
    const attachmentFiles = [
      ...(files?.file ?? []),
      ...(files?.files ?? []),
      ...(files?.attachments ?? []),
    ];
    for (const file of attachmentFiles) {
      // AttachmentsService.upload is also used by the admin-only post-creation upload route.
      // Ticket creation has already authorized both roles and enforced customer ownership, so
      // pass its internal admin gate while retaining the real user id as uploadedById.
      const uploadActor = user.role === UserRole.CUSTOMER ? { ...user, role: UserRole.ADMIN } : user;
      uploaded.push(await this.attachmentsService.upload(ticket.id, uploadActor, file));
    }

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
      attachments: [
        ...ticket.attachments.map((attachment) => ({
          ...attachment,
          sizeBytes: Number(attachment.sizeBytes),
        })),
        ...uploaded.map((attachment) => this.toAttachmentView(attachment)),
      ],
    };
  }

  private async validateRequest(body: unknown): Promise<TicketCreationDto> {
    const value = body && typeof body === 'object' && !Array.isArray(body)
      ? body
      : {};
    const dto = plainToInstance(TicketCreationDto, value);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Ticket submission validation failed',
        fields: this.fieldErrors(errors),
      });
    }
    return dto;
  }

  private fieldErrors(errors: ValidationError[]): Record<string, string[]> {
    const fields: Record<string, string[]> = {};
    for (const error of errors) {
      fields[error.property] = Object.values(error.constraints ?? { invalid: 'is invalid' });
    }
    return fields;
  }

  private async requireCustomer(customerId: string | undefined): Promise<string> {
    if (!customerId) {
      throw new BadRequestException({
        message: 'Ticket submission validation failed',
        fields: { customerId: ['must select a valid customer account'] },
      });
    }
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true, role: true },
    });
    if (!customer || customer.role !== UserRole.CUSTOMER) {
      throw new BadRequestException({
        message: 'Ticket submission validation failed',
        fields: { customerId: ['must select a valid customer account'] },
      });
    }
    return customer.id;
  }

  private toAttachmentView(attachment: AttachmentMetadata): TicketCreationAttachmentView {
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      sizeBytes: attachment.sizeBytes,
      mimeType: attachment.mimeType,
      uploadedById: attachment.uploadedById,
      createdAt: attachment.createdAt,
    };
  }
}
