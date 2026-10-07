import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TicketSeverity, TicketStatus, UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { AttachmentsService, IncomingAttachmentFile } from '../attachments/attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './ticket-creation.dto';
import { TicketCreationService } from './ticket-creation.service';

const customerUser: AuthenticatedUser = {
  id: 'customer-1',
  email: 'customer@example.com',
  name: 'Customer One',
  role: UserRole.CUSTOMER,
};

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: UserRole.ADMIN,
};

function ticketRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-1',
    reference: 40,
    customerId: 'customer-1',
    createdById: 'customer-1',
    updatedById: null,
    title: 'Cannot sign in',
    description: 'The sign-in page rejects my credentials.',
    severity: TicketSeverity.MEDIUM,
    status: TicketStatus.NEW,
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
    customer: { id: 'customer-1', name: 'Customer One', email: 'customer@example.com' },
    ...overrides,
  };
}

it('[AC-9] creates a customer-owned New ticket with sequential reference and optional attachment', async () => {
  const record = ticketRecord();
  const attachment = {
    id: 'attachment-1',
    ticketId: record.id,
    uploadedById: customerUser.id,
    fileName: 'screen.png',
    sizeBytes: 3,
    mimeType: 'image/png',
    storageKey: 'private-key',
  };
  const prisma = {
    user: { findFirst: jest.fn().mockResolvedValue({ id: customerUser.id }) },
    ticket: { create: jest.fn().mockResolvedValue(record) },
  };
  const attachmentService = { upload: jest.fn().mockResolvedValue(attachment) };
  const service = new TicketCreationService(
    prisma as unknown as PrismaService,
    attachmentService as unknown as AttachmentsService,
  );
  const input = {
    title: 'Cannot sign in',
    description: 'The sign-in page rejects my credentials.',
    severity: 'Medium',
    customerId: 'attacker-selected-customer',
  } as CreateTicketDto;
  const file: IncomingAttachmentFile = {
    buffer: Buffer.from('png'),
    originalname: 'screen.png',
    mimetype: 'image/png',
    size: 3,
  };

  const created = await service.create(customerUser, input, [file]);
  expect(created).toMatchObject({ reference: 40, status: TicketStatus.NEW, attachments: [attachment] });
  expect(prisma.user.findFirst).toHaveBeenCalledWith({
    where: { id: customerUser.id, role: UserRole.CUSTOMER },
    select: { id: true },
  });
  expect(prisma.ticket.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      customerId: customerUser.id,
      createdById: customerUser.id,
      severity: TicketSeverity.MEDIUM,
      status: TicketStatus.NEW,
    }),
  }));
  expect(attachmentService.upload).toHaveBeenCalledWith(record.id, customerUser, file);

  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;
  const guard = new AuthGuard({} as PrismaService, reflector);
  const noSessionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
  } as unknown as ExecutionContext;
  await expect(guard.canActivate(noSessionContext)).rejects.toBeInstanceOf(UnauthorizedException);
});

it('[AC-10] identifies title description and severity when required fields are invalid', async () => {
  const invalid = plainToInstance(CreateTicketDto, {
    title: '   ',
    description: '',
    severity: 'Urgent',
  });
  const errors = await validate(invalid);
  const invalidFields = errors.map((error) => error.property).sort();

  expect(invalidFields).toEqual(['description', 'severity', 'title']);
  expect(errors.find((error) => error.property === 'severity')?.constraints).toHaveProperty('isIn');
});

it('[AC-12] creates an admin-selected customer ticket with New status and a sequential reference', async () => {
  const record = ticketRecord({
    id: 'ticket-2',
    reference: 41,
    customerId: 'customer-2',
    createdById: adminUser.id,
    severity: TicketSeverity.HIGH,
    customer: { id: 'customer-2', name: 'Customer Two', email: 'two@example.com' },
  });
  const prisma = {
    user: { findFirst: jest.fn().mockResolvedValue({ id: 'customer-2' }) },
    ticket: { create: jest.fn().mockResolvedValue(record) },
  };
  const attachmentService = { upload: jest.fn() };
  const service = new TicketCreationService(
    prisma as unknown as PrismaService,
    attachmentService as unknown as AttachmentsService,
  );

  const created = await service.create(adminUser, {
    title: 'Payment issue',
    description: 'Please investigate this charge.',
    severity: 'High',
    customerId: 'customer-2',
  }, []);

  expect(created).toMatchObject({ reference: 41, status: TicketStatus.NEW, customerId: 'customer-2' });
  expect(prisma.user.findFirst).toHaveBeenCalledWith({
    where: { id: 'customer-2', role: UserRole.CUSTOMER },
    select: { id: true },
  });
  expect(prisma.ticket.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      customerId: 'customer-2',
      createdById: adminUser.id,
      severity: TicketSeverity.HIGH,
      status: TicketStatus.NEW,
    }),
  }));
});
