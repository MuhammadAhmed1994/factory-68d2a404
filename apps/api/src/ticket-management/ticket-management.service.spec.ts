import { BadRequestException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { TicketSeverity, TicketStatus, UserRole } from '@prisma/client';
import { AuthGuard, AuthenticatedUser } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PrivateFileStore } from '../attachments/private-file-store';
import { TicketManagementController } from './ticket-management.controller';
import { TicketManagementService } from './ticket-management.service';

const admin: AuthenticatedUser = {
  id: 'admin-1', email: 'admin@example.test', name: 'Admin', role: UserRole.ADMIN,
};
const customer: AuthenticatedUser = {
  id: 'customer-1', email: 'customer@example.test', name: 'Customer', role: UserRole.CUSTOMER,
};

function makeService(prisma: Record<string, any>, fileStore = { remove: jest.fn().mockResolvedValue(undefined) }) {
  return {
    service: new TicketManagementService(prisma as unknown as PrismaService, fileStore as unknown as PrivateFileStore),
    fileStore,
  };
}

describe('TicketManagementService', () => {
  it('[AC-15] admin edits validate supplied fields and persist the acting admin and update time', async () => {
    const edited = {
      id: 'ticket-1', title: 'Updated title', description: 'Updated description',
      severity: TicketSeverity.HIGH, updatedById: admin.id, updatedAt: new Date('2026-06-01T12:00:00.000Z'),
    };
    const update = jest.fn().mockResolvedValue(edited);
    const { service } = makeService({ ticket: { update } });

    const result = await service.editTicket('ticket-1', admin, {
      title: 'Updated title', description: 'Updated description', severity: TicketSeverity.HIGH,
    });

    expect(result).toEqual(edited);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'ticket-1' },
      data: expect.objectContaining({
        title: 'Updated title', description: 'Updated description', severity: TicketSeverity.HIGH,
        updatedById: admin.id, updatedAt: expect.any(Date),
      }),
      select: expect.objectContaining({ updatedById: true, updatedAt: true }),
    }));
    await expect(service.editTicket('ticket-1', admin, {})).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('[AC-16] only allowed ticket status transitions are applied and each audit entry records both statuses, actor, and UTC time', async () => {
    let currentStatus = TicketStatus.NEW;
    const audits: Array<Record<string, unknown>> = [];
    const transaction = {
      ticket: {
        findUnique: jest.fn(async () => ({ id: 'ticket-1', status: currentStatus })),
        updateMany: jest.fn(async ({ where, data }: any) => {
          if (where.status !== currentStatus) return { count: 0 };
          currentStatus = data.status;
          return { count: 1 };
        }),
      },
      ticketStatusChange: {
        create: jest.fn(async ({ data }: any) => { audits.push(data); return data; }),
      },
    };
    const { service } = makeService({ $transaction: (callback: (tx: typeof transaction) => unknown) => callback(transaction) });

    await expect(service.changeStatus('ticket-1', admin, { status: TicketStatus.RESOLVED }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(currentStatus).toBe(TicketStatus.NEW);
    expect(audits).toHaveLength(0);

    const transitions: Array<[TicketStatus, TicketStatus]> = [
      [TicketStatus.NEW, TicketStatus.IN_PROGRESS],
      [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
      [TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS],
      [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
      [TicketStatus.RESOLVED, TicketStatus.CLOSED],
    ];
    for (const [fromStatus, toStatus] of transitions) {
      await service.changeStatus('ticket-1', admin, { status: toStatus });
      expect(audits[audits.length - 1]).toEqual(expect.objectContaining({
        ticketId: 'ticket-1', fromStatus, toStatus, changedById: admin.id,
        createdAt: expect.any(Date), updatedAt: expect.any(Date),
      }));
      expect((audits[audits.length - 1].createdAt as Date).toISOString()).toMatch(/Z$/);
    }
    expect(currentStatus).toBe(TicketStatus.CLOSED);
    expect(audits).toHaveLength(transitions.length);
    await expect(service.changeStatus('ticket-1', admin, { status: TicketStatus.IN_PROGRESS }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(audits).toHaveLength(transitions.length);
  });

  it('[AC-18] permanent deletion removes the ticket with attachment records and all private file objects and reports missing tickets', async () => {
    const attachments = [{ storageKey: 'a'.repeat(64) }, { storageKey: 'b'.repeat(64) }];
    const findUnique = jest.fn().mockResolvedValueOnce({ id: 'ticket-1', attachments }).mockResolvedValueOnce(null);
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const { service, fileStore } = makeService({ ticket: { findUnique, deleteMany } });

    await expect(service.deleteTicket('ticket-1', admin)).resolves.toBeUndefined();
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'ticket-1' } });
    expect(fileStore.remove).toHaveBeenNthCalledWith(1, attachments[0].storageKey);
    expect(fileStore.remove).toHaveBeenNthCalledWith(2, attachments[1].storageKey);
    await expect(service.deleteTicket('missing', admin)).rejects.toBeInstanceOf(NotFoundException);
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  it('[AC-24] all mutation routes require authentication and admin role, and customer mutation attempts are rejected without persistence', async () => {
    const guards = Reflect.getMetadata('__guards__', TicketManagementController) as unknown[];
    expect(guards).toEqual(expect.arrayContaining([AuthGuard, RolesGuard]));
    expect(Reflect.getMetadata('roles', TicketManagementController)).toEqual([UserRole.ADMIN]);

    const update = jest.fn();
    const findUnique = jest.fn();
    const deleteMany = jest.fn();
    const { service } = makeService({ ticket: { update, findUnique, deleteMany }, $transaction: jest.fn() });
    await expect(service.editTicket('ticket-1', customer, { title: 'Nope' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.changeStatus('ticket-1', customer, { status: TicketStatus.IN_PROGRESS })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteTicket('ticket-1', customer)).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
