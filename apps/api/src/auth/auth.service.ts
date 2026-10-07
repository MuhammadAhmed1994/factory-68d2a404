import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export const SESSION_COOKIE_NAME = 'session';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthenticatedSessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface SignInResult {
  sessionToken: string;
  user: AuthenticatedSessionUser;
}

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signIn(credentials: SignInCredentials): Promise<SignInResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email.trim().toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const sessionToken = randomBytes(32).toString('base64url');
    const now = new Date();
    const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        lastActivityAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      },
    });

    return {
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async signOut(cookieHeader?: string): Promise<void> {
    const token = this.readCookie(cookieHeader, SESSION_COOKIE_NAME);
    if (!token) return;

    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }

  private readCookie(cookieHeader: string | undefined, name: string): string | undefined {
    if (!cookieHeader) return undefined;
    for (const entry of cookieHeader.split(';')) {
      const separator = entry.indexOf('=');
      if (separator < 0 || entry.slice(0, separator).trim() !== name) continue;
      const value = entry.slice(separator + 1).trim();
      if (!value) return undefined;
      try {
        return decodeURIComponent(value);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}
