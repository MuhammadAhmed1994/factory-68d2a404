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
import { SignInDto } from './auth.dto';
import { AuthenticatedSessionUser, AuthService, SESSION_COOKIE_NAME, SESSION_TTL_MS } from './auth.service';

export interface SignInResponse {
  user: AuthenticatedSessionUser;
}

@Controller('auth/session')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async signIn(
    @Body() credentials: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignInResponse> {
    const result = await this.authService.signIn(credentials);
    response.cookie(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS,
    });
    return { user: result.user };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.signOut(request.headers.cookie);
    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  }
}
