import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { basename } from 'node:path';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PrivateFileStore } from './private-file-store';

export interface IncomingAttachmentFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface AttachmentMetadata {
  id: string;
  ticketId: string;
  uploadedById: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  storageKey: string;
}

export interface DownloadableAttachment extends AttachmentMetadata {
  content: Buffer;
}

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStore: PrivateFileStore,
  ) {}

  async upload(
    ticketId: string,
    uploader: AuthenticatedUser,
    file: IncomingAttachmentFile | undefined,
  ): Promise<AttachmentMetadata> {
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('An attachment file is required');
    }
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const storageKey = await this.fileStore.store(file.buffer);
    try {
      const record = await this.prisma.attachment.create({
        data: {
          ticketId,
          uploadedById: uploader.id,
          fileName: this.safeFileName(file.originalname),
          sizeBytes: BigInt(file.buffer.length),
          mimeType: file.mimetype || 'application/octet-stream',
          storageKey,
        },
        select: {
          id: true,
          ticketId: true,
          uploadedById: true,
          fileName: true,
          sizeBytes: true,
          mimeType: true,
          storageKey: true,
        },
      });
      return this.toMetadata(record);
    } catch (error) {
      await this.fileStore.remove(storageKey);
      throw error;
    }
  }

  async download(
    ticketId: string,
    attachmentId: string,
    requester: AuthenticatedUser,
  ): Promise<DownloadableAttachment> {
    const where = requester.role === UserRole.CUSTOMER
      ? { id: attachmentId, ticketId, ticket: { customerId: requester.id } }
      : { id: attachmentId, ticketId };
    const record = await this.prisma.attachment.findFirst({
      where,
      select: {
        id: true,
        ticketId: true,
        uploadedById: true,
        fileName: true,
        sizeBytes: true,
        mimeType: true,
        storageKey: true,
      },
    });
    if (!record) throw new NotFoundException('Attachment not found');

    const metadata = this.toMetadata(record);
    try {
      return { ...metadata, content: await this.fileStore.read(record.storageKey) };
    } catch {
      throw new NotFoundException('Attachment file not found');
    }
  }

  private toMetadata(record: {
    id: string;
    ticketId: string;
    uploadedById: string;
    fileName: string;
    sizeBytes: bigint;
    mimeType: string;
    storageKey: string;
  }): AttachmentMetadata {
    return {
      ...record,
      sizeBytes: Number(record.sizeBytes),
    };
  }

  private safeFileName(input: string): string {
    const fileName = basename(input.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '').trim();
    return fileName || 'attachment';
  }
}
