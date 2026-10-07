import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PrivateFileStore } from './private-file-store';

export interface UploadedAttachmentFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface AttachmentMetadata {
  id: string;
  ticketId: string;
  uploadedById: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
}

export interface AttachmentDownload {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStore: PrivateFileStore,
  ) {}

  async upload(
    ticketId: string,
    user: AuthenticatedUser,
    file: UploadedAttachmentFile | undefined,
  ): Promise<AttachmentMetadata> {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException();
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new NotFoundException('File is required');
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const storageKey = await this.fileStore.store(file.buffer);
    try {
      const attachment = await this.prisma.attachment.create({
        data: {
          ticketId,
          uploadedById: user.id,
          fileName: file.originalname,
          sizeBytes: BigInt(file.buffer.length),
          mimeType: file.mimetype || 'application/octet-stream',
          storageKey,
        },
      });
      return this.toMetadata(attachment);
    } catch (error) {
      await this.fileStore.remove(storageKey);
      throw error;
    }
  }

  async download(
    ticketId: string,
    attachmentId: string,
    user: AuthenticatedUser,
  ): Promise<AttachmentDownload> {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, ticketId },
      include: { ticket: { select: { customerId: true } } },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (user.role === UserRole.CUSTOMER && attachment.ticket.customerId !== user.id) {
      // Do not reveal that either the ticket or attachment exists.
      throw new NotFoundException('Attachment not found');
    }
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException();
    }

    return {
      bytes: await this.fileStore.read(attachment.storageKey),
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    };
  }

  private toMetadata(attachment: {
    id: string;
    ticketId: string;
    uploadedById: string;
    fileName: string;
    sizeBytes: bigint;
    mimeType: string;
    createdAt: Date;
  }): AttachmentMetadata {
    return {
      id: attachment.id,
      ticketId: attachment.ticketId,
      uploadedById: attachment.uploadedById,
      fileName: attachment.fileName,
      sizeBytes: Number(attachment.sizeBytes),
      mimeType: attachment.mimeType,
      createdAt: attachment.createdAt,
    };
  }
}
