import { NotFoundException } from '@nestjs/common';
import { TicketSeverity, TicketStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService, TicketRecord } from './tickets.service';

const customerA: AuthenticatedUser = {
  id: 'customer-a',
  role: UserRole.CUSTOMER,
  email: 'a@example.test',
  name: 'Customer A',
};

const ticketA = {
  id: 'ticket-a',
  customerId: customerA.id,
  title: 'My ticket',
  customer: { id: customerA.id, name: customerA.name, email: customerA.email },
} as TicketRecord;

function setup(): {
  service: TicketsService;
  findMany: jest.Mock;
  findFirst: jest.Mock;
} {
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const prisma = {
    ticket: { findMany, findFirst },
  } as unknown as PrismaService;
  return { service: new TicketsService(prisma), findMany, findFirst };
}

describe('TicketsService', () => {
  it('[AC-19] isolates customer list and detail results by ticket ownership', async () => {
    const { service, findMany, findFirst } = setup();
    findMany.mockResolvedValue([ticketA]);
    findFirst.mockResolvedValueOnce(ticketA).mockResolvedValueOnce(null);

    await expect(service.list(customerA, {})).resolves.toEqual([ticketA]);
    expect(findMany.mock.calls[0][0].where).toEqual({ customerId: customerA.id });
    await expect(service.findOne(customerA, ticketA.id)).resolves.toEqual(ticketA);
    expect(findFirst.mock.calls[0][0].where).toEqual({ id: ticketA.id, customerId: customerA.id });
    await expect(service.findOne(customerA, 'ticket-owned-by-someone-else')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst.mock.calls[1][0].where).toEqual({
      id: 'ticket-owned-by-someone-else',
      customerId: customerA.id,
    });
  });

  it("[AC-20] applies a customer's status filter without removing the ownership scope", async () => {
    const { service, findMany } = setup();
    findMany.mockResolvedValue([]);

    await expect(service.list(customerA, { status: TicketStatus.IN_PROGRESS })).resolves.toEqual([]);
    expect(findMany.mock.calls[0][0].where).toEqual({
      customerId: customerA.id,
      status: TicketStatus.IN_PROGRESS,
    });
  });

  it('[AC-21] combines admin status, severity, and customer filters', async () => {
    const { service, findMany } = setup();
    const admin: AuthenticatedUser = {
      id: 'admin-1',
      role: UserRole.ADMIN,
      email: 'admin@example.test',
      name: 'Admin',
    };
    findMany.mockResolvedValue([ticketA]);

    await expect(
      service.list(admin, {
        status: TicketStatus.RESOLVED,
        severity: TicketSeverity.HIGH,
        customerId: customerA.id,
      }),
    ).resolves.toEqual([ticketA]);
    expect(findMany.mock.calls[0][0].where).toEqual({
      customerId: customerA.id,
      status: TicketStatus.RESOLVED,
      severity: TicketSeverity.HIGH,
    });
  });
});
