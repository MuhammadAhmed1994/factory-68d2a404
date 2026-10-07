import { createHash } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './roles.decorator';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const SESSION_COOKIE_NAME = 'session';
const SESSION_INACTIVITY_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.getSessionToken(request);
    if (!token) throw new UnauthorizedException();

    const now = new Date();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !session ||
      session.expiresAt.getTime() <= now.getTime() ||
      !session.user.isActive
    ) {
      throw new UnauthorizedException();
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        lastActivityAt: now,
        expiresAt: new Date(now.getTime() + SESSION_INACTIVITY_MS),
      },
    });

    request.user = {
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
      name: session.user.name,
    };
    return true;
  }

  private getSessionToken(request: AuthenticatedRequest): string | undefined {
    const requestWithCookies = request as AuthenticatedRequest & {
      cookies?: Record<string, unknown>;
    };
    const parsedCookie = requestWithCookies.cookies?.[SESSION_COOKIE_NAME];
    if (typeof parsedCookie === 'string' && parsedCookie.length > 0) return parsedCookie;

    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return undefined;
    for (const cookie of cookieHeader.split(';')) {
      const separator = cookie.indexOf('=');
      if (separator < 0 || cookie.slice(0, separator).trim() !== SESSION_COOKIE_NAME) continue;
      const value = cookie.slice(separator + 1).trim();
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
