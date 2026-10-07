import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AttachmentsService } from './attachments.service';
import type { AuthenticatedUser } from '../auth/auth.guard';

describe('AttachmentsService', () => {
  it('[AC-14] authorizes downloads through the parent ticket and returns stored file content only to an allowed requester', async () => {
    const bytes = Buffer.from('private attachment bytes');
    const attachment = {
      id: 'attachment-1',
      ticketId: 'ticket-1',
      uploadedById: 'admin-1',
      fileName: 'private report.txt',
      sizeBytes: BigInt(bytes.length),
      mimeType: 'text/plain',
      storageKey: 'a'.repeat(64),
      createdAt: new Date(),
      ticket: { customerId: 'customer-1' },
    };
    const prisma = {
      ticket: { findUnique: jest.fn() },
      attachment: { findFirst: jest.fn().mockResolvedValue(attachment) },
    };
    const fileStore = {
      store: jest.fn(),
      read: jest.fn().mockResolvedValue(bytes),
      remove: jest.fn(),
    };
    const service = new AttachmentsService(prisma as never, fileStore as never);
    const admin: AuthenticatedUser = {
      id: 'admin-1', email: 'admin@example.test', name: 'Admin', role: UserRole.ADMIN,
    };
    const otherCustomer: AuthenticatedUser = {
      id: 'customer-2', email: 'other@example.test', name: 'Other', role: UserRole.CUSTOMER,
    };

    const authorizedDownload = await service.download('ticket-1', 'attachment-1', admin);
    expect(authorizedDownload).toEqual({
      bytes,
      fileName: 'private report.txt',
      mimeType: 'text/plain',
    });

    fileStore.read.mockClear();
    await expect(service.download('ticket-1', 'attachment-1', otherCustomer))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(fileStore.read).not.toHaveBeenCalled();
  });
});
