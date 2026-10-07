import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export const SESSION_INACTIVITY_MS = 12 * 60 * 60 * 1000;
export const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface CreatedSession {
  token: string;
  user: SessionUser;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(email: string, password: string): Promise<CreatedSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const token = randomBytes(32).toString('hex');
    const now = new Date();
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        lastActivityAt: now,
        expiresAt: new Date(now.getTime() + SESSION_INACTIVITY_MS),
      },
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async revokeSession(token: string | undefined): Promise<void> {
    if (!token) return;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }
}
