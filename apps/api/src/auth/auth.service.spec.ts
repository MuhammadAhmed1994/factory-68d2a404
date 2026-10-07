import { createHash } from 'node:crypto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService, INVALID_CREDENTIALS_MESSAGE, SESSION_INACTIVITY_MS } from './auth.service';

function makeService(): {
  service: AuthService;
  prisma: {
    user: { findUnique: jest.Mock };
    session: { create: jest.Mock; deleteMany: jest.Mock };
  };
} {
  const prisma = {
    user: { findUnique: jest.fn() },
    session: { create: jest.fn().mockResolvedValue({}) , deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  return { service: new AuthService(prisma as unknown as PrismaService), prisma };
}

const admin = {
  id: 'admin-id',
  email: 'admin@example.com',
  name: 'Admin',
  role: UserRole.ADMIN,
  isActive: true,
  passwordHash: '',
};

it('[AC-1]', async () => {
  const { service, prisma } = makeService();
  const passwordHash = await bcrypt.hash('correct horse', 4);
  prisma.user.findUnique.mockResolvedValue({ ...admin, passwordHash });

  const created = await service.createSession('ADMIN@example.com', 'correct horse');
  expect(created.user.role).toBe(UserRole.ADMIN);
  expect(created.token).toHaveLength(64);
  expect(prisma.session.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      userId: admin.id,
      tokenHash: createHash('sha256').update(created.token).digest('hex'),
      lastActivityAt: expect.any(Date),
      expiresAt: expect.any(Date),
    }),
  });
  const sessionData = prisma.session.create.mock.calls[0][0].data;
  expect(sessionData.expiresAt.getTime() - sessionData.lastActivityAt.getTime()).toBe(SESSION_INACTIVITY_MS);

  await service.revokeSession(created.token);
  expect(prisma.session.deleteMany).toHaveBeenCalledWith({
    where: { tokenHash: createHash('sha256').update(created.token).digest('hex') },
  });
});

it('[AC-2]', async () => {
  const { service, prisma } = makeService();
  const passwordHash = await bcrypt.hash('correct horse', 4);
  const responses: Array<{ status: number; message: string }> = [];

  prisma.user.findUnique.mockResolvedValue(null);
  try {
    await service.createSession('missing@example.com', 'wrong');
  } catch (error) {
    const exception = error as { getStatus: () => number; getResponse: () => unknown };
    const response = exception.getResponse() as { message: string };
    responses.push({ status: exception.getStatus(), message: response.message });
  }

  prisma.user.findUnique.mockResolvedValue({ ...admin, isActive: false, passwordHash });
  try {
    await service.createSession(admin.email, 'wrong');
  } catch (error) {
    const exception = error as { getStatus: () => number; getResponse: () => unknown };
    const response = exception.getResponse() as { message: string };
    responses.push({ status: exception.getStatus(), message: response.message });
  }

  prisma.user.findUnique.mockResolvedValue({ ...admin, passwordHash });
  try {
    await service.createSession(admin.email, 'wrong');
  } catch (error) {
    const exception = error as { getStatus: () => number; getResponse: () => unknown };
    const response = exception.getResponse() as { message: string };
    responses.push({ status: exception.getStatus(), message: response.message });
  }

  expect(responses).toEqual([
    { status: 401, message: INVALID_CREDENTIALS_MESSAGE },
    { status: 401, message: INVALID_CREDENTIALS_MESSAGE },
    { status: 401, message: INVALID_CREDENTIALS_MESSAGE },
  ]);
  expect(prisma.session.create).not.toHaveBeenCalled();
});

it('[AC-3]', async () => {
  const { service, prisma } = makeService();
  const customer = {
    ...admin,
    id: 'customer-id',
    email: 'customer@example.com',
    name: 'Customer',
    role: UserRole.CUSTOMER,
    isActive: true,
    passwordHash: await bcrypt.hash('customer password', 4),
  };
  prisma.user.findUnique.mockResolvedValue(customer);

  const session = await service.createSession(customer.email, 'customer password');
  expect(session.user).toEqual({
    id: customer.id,
    email: customer.email,
    name: customer.name,
    role: UserRole.CUSTOMER,
  });
  expect(prisma.session.create).toHaveBeenCalledTimes(1);
  await service.revokeSession(session.token);
  expect(prisma.session.deleteMany).toHaveBeenCalledTimes(1);
});

it('[AC-4]', async () => {
  const { service, prisma } = makeService();
  const customer = {
    ...admin,
    id: 'inactive-customer',
    email: 'inactive@example.com',
    role: UserRole.CUSTOMER,
    isActive: false,
    passwordHash: await bcrypt.hash('customer password', 4),
  };
  prisma.user.findUnique.mockResolvedValue(customer);

  await expect(service.createSession(customer.email, 'customer password')).rejects.toMatchObject({
    status: 401,
    response: { message: INVALID_CREDENTIALS_MESSAGE },
  });
  prisma.user.findUnique.mockResolvedValue(null);
  await expect(service.createSession('unknown@example.com', 'customer password')).rejects.toMatchObject({
    status: 401,
    response: { message: INVALID_CREDENTIALS_MESSAGE },
  });
  expect(prisma.session.create).not.toHaveBeenCalled();
});
