import { BadRequestException } from '@nestjs/common';
import { TicketSeverity, TicketStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { TicketCreationService } from './ticket-creation.service';

const customerUser: AuthenticatedUser = {
  id: 'customer-1', role: UserRole.CUSTOMER, email: 'customer@example.com', name: 'Customer',
};
const adminUser: AuthenticatedUser = {
  id: 'admin-1', role: UserRole.ADMIN, email: 'admin@example.com', name: 'Admin',
};

function makeTicket(
  customerId: string,
  createdById: string,
  severity: TicketSeverity = TicketSeverity.HIGH,
) {
  return {
    id: 'ticket-1', reference: 21, customerId, createdById, updatedById: null,
    title: 'Cannot sign in', description: 'Login fails', severity,
    status: TicketStatus.NEW, createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    customer: { id: customerId, name: 'Customer', email: 'customer@example.com' },
    attachments: [],
  };
}

function setup() {
  const create = jest.fn();
  const findUnique = jest.fn();
  const prisma = { ticket: { create }, user: { findUnique } } as unknown as PrismaService;
  const upload = jest.fn();
  const attachments = { upload } as unknown as AttachmentsService;
  return { service: new TicketCreationService(prisma, attachments), create, findUnique, upload };
}

describe('TicketCreationService', () => {
  it('[AC-9] creates a customer-owned New ticket with a unique sequential reference', async () => {
    const { service, create, findUnique } = setup();
    create.mockResolvedValue(makeTicket('customer-1', 'customer-1'));

    const result = await service.createTicket(customerUser, {
      title: 'Cannot sign in', description: 'Login fails', severity: 'High', customerId: 'other-customer',
    });

    expect(result).toMatchObject({
      reference: 21, customerId: 'customer-1', createdById: 'customer-1',
      severity: TicketSeverity.HIGH, status: TicketStatus.NEW,
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        customerId: 'customer-1', createdById: 'customer-1', severity: TicketSeverity.HIGH,
      }),
    }));
    expect(create.mock.calls[0][0].data).not.toHaveProperty('reference');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('[AC-10] reports every missing or invalid ticket field as a 400 validation error', async () => {
    const { service, create } = setup();

    let caught: unknown;
    try {
      await service.createTicket(customerUser, { title: ' ', description: '', severity: 'urgent' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    const exception = caught as BadRequestException;
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toMatchObject({
      fields: expect.objectContaining({ title: expect.any(Array), description: expect.any(Array), severity: expect.any(Array) }),
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('[AC-12] creates an admin-selected customer ticket and records the acting admin', async () => {
    const { service, create, findUnique } = setup();
    findUnique.mockResolvedValue({ id: 'customer-2', role: UserRole.CUSTOMER });
    create.mockResolvedValue(makeTicket('customer-2', 'admin-1', TicketSeverity.MEDIUM));

    const result = await service.createTicket(adminUser, {
      customerId: 'customer-2', title: 'Cannot sign in', description: 'Login fails', severity: 'Medium',
    });

    expect(result).toMatchObject({
      customerId: 'customer-2', createdById: 'admin-1', status: TicketStatus.NEW,
      severity: TicketSeverity.MEDIUM, reference: 21,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'customer-2' }, select: { id: true, role: true },
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customerId: 'customer-2', createdById: 'admin-1' }),
    }));
  });
});
