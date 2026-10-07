import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService, SESSION_TTL_MS } from './auth.service';

const PASSWORD = 'Strong-password-42';

function createTestService(user: Record<string, unknown> | null, active = true): {
  service: AuthService;
  findUser: jest.Mock;
  createSession: jest.Mock;
  deleteSessions: jest.Mock;
} {
  const findUser = jest.fn().mockResolvedValue(
    user ? { ...user, isActive: active } : null,
  );
  const createSession = jest.fn().mockResolvedValue({ id: 'session-id' });
  const deleteSessions = jest.fn().mockResolvedValue({ count: 1 });
  const prisma = {
    user: { findUnique: findUser },
    session: { create: createSession, deleteMany: deleteSessions },
  } as unknown as PrismaService;
  return {
    service: new AuthService(prisma),
    findUser,
    createSession,
    deleteSessions,
  };
}

async function makeUser(role: UserRole = UserRole.ADMIN): Promise<Record<string, unknown>> {
  return {
    id: `${role.toLowerCase()}-id`,
    email: `${role.toLowerCase()}@example.com`,
    name: `Test ${role}`,
    role,
    isActive: true,
    passwordHash: await bcrypt.hash(PASSWORD, 4),
  };
}

async function getCredentialError(service: AuthService): Promise<unknown> {
  try {
    await service.signIn({ email: 'person@example.com', password: 'wrong-password' });
  } catch (error) {
    expect(error).toBeInstanceOf(UnauthorizedException);
    return (error as UnauthorizedException).getResponse();
  }
  throw new Error('Sign-in unexpectedly succeeded');
}

describe('AuthService', () => {
  it('[AC-1] authenticates an admin, persists an opaque session, and revokes it on sign-out', async () => {
    const user = await makeUser(UserRole.ADMIN);
    const { service, createSession, deleteSessions } = createTestService(user);

    const result = await service.signIn({ email: 'ADMIN@example.com', password: PASSWORD });
    expect(result.user.role).toBe(UserRole.ADMIN);
    expect(result.sessionToken).toEqual(expect.any(String));
    expect(createSession).toHaveBeenCalledTimes(1);
    const persistedSession = createSession.mock.calls[0][0].data;
    expect(persistedSession.tokenHash).not.toBe(result.sessionToken);
    expect(persistedSession.expiresAt.getTime() - persistedSession.lastActivityAt.getTime())
      .toBe(SESSION_TTL_MS);

    await service.signOut(`other=value; session=${encodeURIComponent(result.sessionToken)}`);
    expect(deleteSessions).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.any(String),
      },
    });
    expect(deleteSessions.mock.calls[0][0].where.tokenHash).toBe(persistedSession.tokenHash);
  });

  it('[AC-2] returns one generic credential error for missing users, inactive accounts, and wrong passwords', async () => {
    const user = await makeUser(UserRole.ADMIN);
    const missing = createTestService(null);
    const inactive = createTestService(user, false);
    const wrongPassword = createTestService(user);
    const errorResponses = await Promise.all([
      getCredentialError(missing.service),
      getCredentialError(inactive.service),
      wrongPassword.service
        .signIn({ email: 'person@example.com', password: 'wrong-password' })
        .then(() => {
          throw new Error('Sign-in unexpectedly succeeded');
        })
        .catch((error: unknown) => {
          expect(error).toBeInstanceOf(UnauthorizedException);
          return (error as UnauthorizedException).getResponse();
        }),
    ]);

    expect(errorResponses[0]).toEqual({
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
    });
    expect(errorResponses[1]).toEqual(errorResponses[0]);
    expect(errorResponses[2]).toEqual(errorResponses[0]);
  });

  it('[AC-3] authenticates an active customer and revokes the persisted session on sign-out', async () => {
    const user = await makeUser(UserRole.CUSTOMER);
    const { service, createSession, deleteSessions } = createTestService(user);

    const result = await service.signIn({ email: 'customer@example.com', password: PASSWORD });
    expect(result.user.role).toBe(UserRole.CUSTOMER);
    expect(createSession).toHaveBeenCalledTimes(1);
    await service.signOut(`session=${result.sessionToken}`);
    expect(deleteSessions).toHaveBeenCalledTimes(1);
    expect(deleteSessions.mock.calls[0][0].where.tokenHash).toBe(
      createSession.mock.calls[0][0].data.tokenHash,
    );
  });

  it('[AC-4] rejects unregistered and deactivated customer accounts with the generic credential error', async () => {
    const inactiveCustomer = await makeUser(UserRole.CUSTOMER);
    const missing = createTestService(null);
    const inactive = createTestService(inactiveCustomer, false);

    const missingError = await getCredentialError(missing.service);
    const inactiveError = await getCredentialError(inactive.service);
    expect(missingError).toEqual({
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
    });
    expect(inactiveError).toEqual(missingError);
    expect(missing.createSession).not.toHaveBeenCalled();
    expect(inactive.createSession).not.toHaveBeenCalled();
  });
});
