import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketSeverity, TicketStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TicketFiltersDto } from './tickets.dto';
import { TicketsService } from './tickets.service';

function customer(id = 'customer-1'): AuthenticatedUser {
  return { id, role: UserRole.CUSTOMER, email: `${id}@example.com`, name: 'Customer' };
}

function admin(): AuthenticatedUser {
  return { id: 'admin-1', role: UserRole.ADMIN, email: 'admin@example.com', name: 'Admin' };
}

function createService() {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const prisma = { ticket: { findMany, findUnique } } as unknown as PrismaService;
  return { service: new TicketsService(prisma), findMany, findUnique };
}

const ticket = (customerId = 'customer-1') => ({
  id: 'ticket-1',
  reference: 101,
  customerId,
  createdById: customerId,
  updatedById: null,
  title: 'Cannot sign in',
  description: 'Login fails',
  severity: TicketSeverity.HIGH,
  status: TicketStatus.NEW,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  customer: { id: customerId, name: 'Customer', email: `${customerId}@example.com` },
  attachments: [],
});

describe('TicketsService', () => {
  it('[AC-19] isolates customer lists and returns the same not-found response for absent and other-owned details', async () => {
    const { service, findMany, findUnique } = createService();
    findMany.mockResolvedValue([ticket()]);
    findUnique.mockResolvedValueOnce(ticket('customer-2')).mockResolvedValueOnce(null);

    const list = await service.listTickets(customer(), new TicketFiltersDto());
    expect(list).toHaveLength(1);
    expect(findMany.mock.calls[0][0].where).toEqual({ customerId: 'customer-1' });

    const errors: unknown[] = [];
    for (const id of ['ticket-1', 'missing-ticket']) {
      try {
        await service.getTicket(customer(), id);
      } catch (error) {
        errors.push(error);
      }
    }
    expect(errors).toHaveLength(2);
    expect(errors[0]).toBeInstanceOf(NotFoundException);
    expect((errors[0] as NotFoundException).getResponse()).toEqual(
      (errors[1] as NotFoundException).getResponse(),
    );
    expect((errors[0] as NotFoundException).getStatus()).toBe(404);
  });

  it('[AC-20] applies a valid status filter within the authenticated customer ownership scope', async () => {
    const { service, findMany } = createService();
    findMany.mockResolvedValue([ticket()]);

    await service.listTickets(customer(), { status: TicketStatus.IN_PROGRESS });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: 'customer-1', status: TicketStatus.IN_PROGRESS },
      orderBy: { createdAt: 'desc' },
    }));
    await expect(service.listTickets(customer(), { status: 'bogus' } as unknown as TicketFiltersDto))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('[AC-21] lets admins filter ticket results by status, severity, and customer', async () => {
    const { service, findMany } = createService();
    findMany.mockResolvedValue([ticket('customer-2')]);

    const result = await service.listTickets(admin(), {
      status: TicketStatus.RESOLVED,
      severity: TicketSeverity.MEDIUM,
      customerId: 'customer-2',
    });

    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: TicketStatus.RESOLVED,
        severity: TicketSeverity.MEDIUM,
        customerId: 'customer-2',
      },
    }));
  });
});
