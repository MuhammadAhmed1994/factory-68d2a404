import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomerListQueryDto,
  UpdateCustomerDto,
} from './customers.dto';
import { CustomersService } from './customers.service';

function customerRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-06-01T12:00:00.000Z');
  return {
    id: 'customer-1',
    email: 'customer@example.com',
    name: 'Customer One',
    role: UserRole.CUSTOMER,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

it('[AC-5] creates, searches, and views customer records', async () => {
  const record = customerRecord();
  const prisma = {
    user: {
      create: jest.fn().mockResolvedValue(record),
      findMany: jest.fn().mockResolvedValue([record]),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue(record),
    },
  };
  const service = new CustomersService(prisma as unknown as PrismaService);

  const created = await service.create({
    email: ' Customer@Example.com ',
    name: ' Customer One ',
    password: 'long-password',
  });
  expect(created).toEqual(record);
  expect(prisma.user.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      email: 'customer@example.com',
      name: 'Customer One',
      role: UserRole.CUSTOMER,
      passwordHash: expect.any(String),
    }),
    select: expect.objectContaining({
      email: true,
      isActive: true,
    }),
  });
  expect(prisma.user.create.mock.calls[0][0].select).not.toHaveProperty('passwordHash');

  const results = await service.list({ search: 'example', page: 1 } as CustomerListQueryDto);
  expect(results.customers).toEqual([record]);
  expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: {
      role: UserRole.CUSTOMER,
      OR: [
        { name: { contains: 'example', mode: 'insensitive' } },
        { email: { contains: 'example', mode: 'insensitive' } },
      ],
    },
  }));
  await expect(service.findOne(record.id)).resolves.toEqual(record);
  expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: record.id, role: UserRole.CUSTOMER },
  }));
});

it('[AC-6] orders customer pages newest first and limits every page to 20', async () => {
  const secondPage = [customerRecord({ id: 'customer-21' })];
  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue(secondPage),
      count: jest.fn().mockResolvedValue(21),
    },
  };
  const service = new CustomersService(prisma as unknown as PrismaService);

  const result = await service.list({ page: 2 } as CustomerListQueryDto);
  expect(result).toEqual({ customers: secondPage, page: 2, limit: 20, total: 21 });
  expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
    orderBy: { createdAt: 'desc' },
    skip: 20,
    take: 20,
  }));
});

it('[AC-7] updates customer details without changing the creation email', async () => {
  const record = customerRecord();
  const updated = customerRecord({ name: 'Updated Name' });
  const prisma = {
    user: {
      findFirst: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue(updated),
    },
  };
  const service = new CustomersService(prisma as unknown as PrismaService);
  const input: UpdateCustomerDto = { name: 'Updated Name' };

  await expect(service.update(record.id, input)).resolves.toEqual(updated);
  expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: record.id },
    data: { name: 'Updated Name' },
  }));
  expect(prisma.user.update.mock.calls[0][0].data).not.toHaveProperty('email');
});

it('[AC-8] deactivates and reactivates customer records and exposes active state', async () => {
  const inactive = customerRecord({ isActive: false });
  const active = customerRecord({ isActive: true });
  const prisma = {
    user: {
      findFirst: jest.fn().mockResolvedValue(customerRecord()),
      update: jest.fn()
        .mockResolvedValueOnce(inactive)
        .mockResolvedValueOnce(active),
    },
  };
  const service = new CustomersService(prisma as unknown as PrismaService);

  await expect(service.setActivation('customer-1', false)).resolves.toMatchObject({ isActive: false });
  await expect(service.setActivation('customer-1', true)).resolves.toMatchObject({ isActive: true });
  expect(prisma.user.update).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: { isActive: false } }));
  expect(prisma.user.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: { isActive: true } }));
});

it('[AC-25] rejects unauthenticated and customer-role management requests', async () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as unknown as Reflector;
  const auth = new AuthGuard({} as PrismaService, reflector);
  const unauthenticatedContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
  } as unknown as ExecutionContext;

  await expect(auth.canActivate(unauthenticatedContext)).rejects.toBeInstanceOf(UnauthorizedException);

  const rolesReflector = {
    getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
  } as unknown as Reflector;
  const roles = new RolesGuard(rolesReflector);
  const customerContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.CUSTOMER } }) }),
  } as unknown as ExecutionContext;

  expect(() => roles.canActivate(customerContext)).toThrow(ForbiddenException);
});
