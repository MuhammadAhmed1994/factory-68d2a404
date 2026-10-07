import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, CreatedSession, SESSION_INACTIVITY_MS, SessionUser } from './auth.service';
import { CreateSessionDto } from './auth.dto';
import { Public } from './roles.decorator';

export const SESSION_COOKIE_NAME = 'session';

@Controller('auth/session')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async create(
    @Body() credentials: CreateSessionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionUser> {
    const session: CreatedSession = await this.authService.createSession(
      credentials.email,
      credentials.password,
    );
    response.cookie(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_INACTIVITY_MS,
    });
    return session.user;
  }

  @Public()
  @Delete()
  @HttpCode(HttpStatus.OK)
  async remove(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: true }> {
    await this.authService.revokeSession(this.readSessionToken(request));
    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
    return { success: true };
  }

  private readSessionToken(request: Request): string | undefined {
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
