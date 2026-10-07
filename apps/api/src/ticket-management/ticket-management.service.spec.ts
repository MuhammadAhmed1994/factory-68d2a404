import { BadRequestException, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TicketSeverity, TicketStatus, UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PrivateFileStore } from '../attachments/private-file-store';
import { TicketManagementController } from './ticket-management.controller';
import { TicketManagementService } from './ticket-management.service';
import type { UpdateTicketDto } from './ticket-management.dto';

const admin: AuthenticatedUser = {
  id: 'admin-1',
  role: UserRole.ADMIN,
  email: 'admin@example.test',
  name: 'Admin',
};

function fixture() {
  const ticketUpdate = jest.fn();
  const findUnique = jest.fn();
  const ticketDelete = jest.fn();
  const statusCreate = jest.fn();
  const tx = {
    ticket: { findUnique, update: ticketUpdate },
    ticketStatusChange: { create: statusCreate },
  };
  const prisma = {
    ticket: { update: ticketUpdate, findUnique, delete: ticketDelete },
    $transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  const removeFile = jest.fn().mockResolvedValue(undefined);
  const service = new TicketManagementService(
    prisma as unknown as PrismaService,
    { remove: removeFile } as unknown as PrivateFileStore,
  );
  return { service, prisma, tx, ticketUpdate, findUnique, ticketDelete, statusCreate, removeFile };
}

describe('TicketManagementService', () => {
  it('[AC-15] admin edits ticket details and persists updatedById and updatedAt', async () => {
    const { service, prisma, ticketUpdate } = fixture();
    const updatedAt = new Date();
    ticketUpdate.mockResolvedValue({
      id: 'ticket-1',
      title: 'Revised title',
      description: 'Revised description',
      severity: TicketSeverity.HIGH,
      updatedById: admin.id,
      updatedAt,
    });
    const fields: UpdateTicketDto = {
      title: 'Revised title',
      description: 'Revised description',
      severity: TicketSeverity.HIGH,
    };

    await expect(service.update('ticket-1', admin, fields)).resolves.toMatchObject({
      updatedById: admin.id,
      title: fields.title,
      description: fields.description,
      severity: TicketSeverity.HIGH,
    });
    const updateData = prisma.ticket.update.mock.calls[0][0].data;
    expect(updateData).toMatchObject({
      title: fields.title,
      description: fields.description,
      severity: TicketSeverity.HIGH,
      updatedById: admin.id,
    });
    expect(updateData.updatedAt).toBeInstanceOf(Date);
    expect(prisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ticket-1' } }));
  });

  it('[AC-16] permits only allowed status transitions and records each admin audit in UTC', async () => {
    const { service, ticketUpdate, findUnique, statusCreate } = fixture();
    const transitions: Array<[TicketStatus, TicketStatus]> = [
      [TicketStatus.NEW, TicketStatus.IN_PROGRESS],
      [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
      [TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS],
      [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
      [TicketStatus.RESOLVED, TicketStatus.CLOSED],
    ];
    for (const [fromStatus, toStatus] of transitions) {
      findUnique.mockResolvedValueOnce({ id: 'ticket-1', status: fromStatus });
      ticketUpdate.mockResolvedValueOnce({ id: 'ticket-1', status: toStatus });
      await expect(service.changeStatus('ticket-1', admin, toStatus)).resolves.toMatchObject({ status: toStatus });
    }

    expect(statusCreate).toHaveBeenCalledTimes(transitions.length);
    transitions.forEach(([fromStatus, toStatus], index) => {
      const audit = statusCreate.mock.calls[index][0].data;
      expect(audit).toMatchObject({
        ticketId: 'ticket-1',
        fromStatus,
        toStatus,
        changedById: admin.id,
      });
      expect(audit.createdAt).toBeInstanceOf(Date);
      expect(audit.createdAt.toISOString()).toMatch(/Z$/);
      expect(audit.updatedAt).toEqual(audit.createdAt);
    });

    findUnique.mockResolvedValueOnce({ id: 'ticket-1', status: TicketStatus.NEW });
    await expect(service.changeStatus('ticket-1', admin, TicketStatus.RESOLVED)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(ticketUpdate).toHaveBeenCalledTimes(transitions.length);
    expect(statusCreate).toHaveBeenCalledTimes(transitions.length);
  });

  it('[AC-18] permanently deletes the ticket, attachment records, and privately stored objects', async () => {
    const { service, prisma, findUnique, ticketDelete, removeFile } = fixture();
    findUnique.mockResolvedValue({
      id: 'ticket-1',
      attachments: [{ storageKey: 'private-object-1' }, { storageKey: 'private-object-2' }],
    });
    ticketDelete.mockResolvedValue({ id: 'ticket-1' });

    await expect(service.remove('ticket-1')).resolves.toEqual({ success: true });
    expect(removeFile).toHaveBeenCalledTimes(2);
    expect(removeFile).toHaveBeenCalledWith('private-object-1');
    expect(removeFile).toHaveBeenCalledWith('private-object-2');
    expect(prisma.ticket.delete).toHaveBeenCalledWith({ where: { id: 'ticket-1' } });
  });

  it('[AC-24] rejects unauthenticated and customer mutations while allowing only admin role metadata', async () => {
    const unauthenticatedReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const authGuard = new AuthGuard({} as PrismaService, unauthenticatedReflector);
    const unauthenticatedContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as unknown as ExecutionContext;
    await expect(authGuard.canActivate(unauthenticatedContext)).rejects.toBeInstanceOf(UnauthorizedException);

    const roleReflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const rolesGuard = new RolesGuard(roleReflector);
    const customerContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.CUSTOMER } }) }),
    } as unknown as ExecutionContext;
    expect(() => rolesGuard.canActivate(customerContext)).toThrow(ForbiddenException);
    expect(Reflect.getMetadata(ROLES_KEY, TicketManagementController)).toEqual([UserRole.ADMIN]);
  });
});
