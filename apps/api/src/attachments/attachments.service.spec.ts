import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentsService } from './attachments.service';
import { PrivateFileStore } from './private-file-store';

it('[AC-14] permits authorized attachment downloads and hides another customer’s ticket', async () => {
  const content = Buffer.from('private attachment bytes');
  const attachmentRecord = {
    id: 'attachment-1',
    ticketId: 'ticket-1',
    uploadedById: 'admin-1',
    fileName: 'support evidence.txt',
    sizeBytes: BigInt(content.length),
    mimeType: 'text/plain',
    storageKey: 'a78fcd5f-13bd-4d2c-829a-712125004095',
  };
  const prisma = {
    ticket: { findUnique: jest.fn().mockResolvedValue({ id: 'ticket-1' }) },
    attachment: {
      create: jest.fn().mockResolvedValue(attachmentRecord),
      findFirst: jest.fn().mockResolvedValueOnce(attachmentRecord).mockResolvedValueOnce(null),
    },
  };
  const fileStore = {
    store: jest.fn().mockResolvedValue(attachmentRecord.storageKey),
    read: jest.fn().mockResolvedValue(content),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AttachmentsService(
    prisma as unknown as PrismaService,
    fileStore as unknown as PrivateFileStore,
  );
  const admin: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: UserRole.ADMIN,
  };
  const otherCustomer: AuthenticatedUser = {
    id: 'customer-2',
    email: 'customer@example.com',
    name: 'Customer',
    role: UserRole.CUSTOMER,
  };

  const uploaded = await service.upload('ticket-1', admin, {
    buffer: content,
    originalname: 'support evidence.txt',
    size: content.length,
    mimetype: 'text/plain',
  });
  expect(uploaded).toMatchObject({
    ticketId: 'ticket-1',
    uploadedById: 'admin-1',
    fileName: 'support evidence.txt',
    sizeBytes: content.length,
    mimeType: 'text/plain',
    storageKey: attachmentRecord.storageKey,
  });
  expect(prisma.attachment.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      ticketId: 'ticket-1',
      uploadedById: 'admin-1',
      sizeBytes: BigInt(content.length),
      storageKey: attachmentRecord.storageKey,
    }),
  }));

  const downloaded = await service.download('ticket-1', 'attachment-1', admin);
  expect(downloaded.content).toEqual(content);
  expect(downloaded.fileName).toBe('support evidence.txt');
  expect(downloaded.mimeType).toBe('text/plain');

  await expect(service.download('ticket-1', 'attachment-1', otherCustomer))
    .rejects.toBeInstanceOf(NotFoundException);
  expect(prisma.attachment.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
    where: {
      id: 'attachment-1',
      ticketId: 'ticket-1',
      ticket: { customerId: 'customer-2' },
    },
  }));
  expect(fileStore.read).toHaveBeenCalledTimes(1);
});
