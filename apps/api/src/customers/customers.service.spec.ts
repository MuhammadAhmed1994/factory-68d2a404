import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

function makeCustomer(id: string, createdAt = new Date()): {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id,
    email: `${id}@example.com`,
    name: `Customer ${id}`,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  };
}

function setupService(): {
  service: CustomersService;
  user: {
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
} {
  const user = {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const prisma = { user } as unknown as PrismaService;
  return { service: new CustomersService(prisma), user };
}

describe('CustomersService', () => {
  it('[AC-5] creates a customer, searches records, and views a customer without exposing password data', async () => {
    const { service, user } = setupService();
    const record = makeCustomer('customer-1');
    user.create.mockResolvedValue(record);
    user.findMany.mockResolvedValue([record]);
    user.count.mockResolvedValue(1);
    user.findFirst.mockResolvedValue(record);

    const created = await service.create({ email: ' CUSTOMER@example.com ', name: ' New Customer ' });
    expect(created).toEqual(record);
    expect(user.create.mock.calls[0][0].data).toMatchObject({
      email: 'customer@example.com',
      name: 'New Customer',
      role: UserRole.CUSTOMER,
      isActive: true,
    });
    expect(user.create.mock.calls[0][0].data.passwordHash).not.toBe('');
    const results = await service.list({ search: 'Example', page: 1, limit: 20 });
    expect(results.customers).toEqual([record]);
    expect(user.findMany.mock.calls[0][0].where.OR).toEqual([
      { name: { contains: 'Example', mode: 'insensitive' } },
      { email: { contains: 'Example', mode: 'insensitive' } },
    ]);
    expect(await service.getById(record.id)).toEqual(record);
    expect(user.findFirst).toHaveBeenCalledWith({
      where: { id: record.id, role: UserRole.CUSTOMER },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('[AC-6] returns newest-first customer pages with no more than 20 records per page', async () => {
    const { service, user } = setupService();
    const rows = Array.from({ length: 20 }, (_, index) =>
      makeCustomer(`customer-${index}`, new Date(Date.UTC(2026, 0, 20 - index))),
    );
    user.findMany.mockResolvedValue(rows);
    user.count.mockResolvedValue(25);

    const page = await service.list({ page: 2, limit: 20 });
    expect(page.customers).toEqual(rows);
    expect(page.total).toBe(25);
    expect(user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { createdAt: 'desc' },
      skip: 20,
      take: 20,
    }));
    expect((await service.list({ page: 1, limit: 99 })).limit).toBe(20);
  });

  it('[AC-7] updates editable customer details but keeps the creation email immutable', async () => {
    const { service, user } = setupService();
    const record = makeCustomer('customer-2');
    user.findFirst.mockResolvedValue({ id: record.id });
    user.update.mockResolvedValue({ ...record, name: 'Updated Name' });

    const updated = await service.update(record.id, { name: 'Updated Name' });
    expect(updated.name).toBe('Updated Name');
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: record.id },
      data: { name: 'Updated Name' },
    }));
    expect(user.update.mock.calls[0][0].data).not.toHaveProperty('email');
  });

  it('[AC-8] deactivates and reactivates a customer and returns the current state', async () => {
    const { service, user } = setupService();
    const record = makeCustomer('customer-3');
    user.findFirst.mockResolvedValue({ id: record.id });
    user.update
      .mockResolvedValueOnce({ ...record, isActive: false })
      .mockResolvedValueOnce({ ...record, isActive: true });

    const deactivated = await service.setActivation(record.id, false);
    const reactivated = await service.setActivation(record.id, true);
    expect(deactivated.isActive).toBe(false);
    expect(reactivated.isActive).toBe(true);
    expect(user.update.mock.calls.map(([args]) => args.data)).toEqual([
      { isActive: false },
      { isActive: true },
    ]);
  });

  it('[AC-25] rejects unauthenticated requests with 401 and customer-role requests with 403', async () => {
    expect(Reflect.getMetadata('__guards__', CustomersController)).toEqual([
      AuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, CustomersController)).toEqual([UserRole.ADMIN]);

    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const authGuard = new AuthGuard({} as PrismaService, reflector);
    const context = (request: Record<string, unknown>): ExecutionContext => ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext);

    await expect(authGuard.canActivate(context({ headers: {} })))
      .rejects.toBeInstanceOf(UnauthorizedException);

    const roleReflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const rolesGuard = new RolesGuard(roleReflector);
    expect(() => rolesGuard.canActivate(context({
      user: { id: 'customer-4', role: UserRole.CUSTOMER },
    }))).toThrow(ForbiddenException);
  });
});
