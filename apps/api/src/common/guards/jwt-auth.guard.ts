import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

const ACCESS_COOKIE = 'mp_access';

interface AccessPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
  locale: string;
  typ: 'access';
}

/**
 * Access tokenni ikki joydan qabul qiladi: `Authorization: Bearer <jwt>` va `mp_access` cookie.
 * Bot va testlar Bearer'dan, veb-ilova cookie'dan foydalanadi.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      Request & { headers: Record<string, string | undefined>; cookies?: Record<string, string> }
    >();
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    const token = bearer || req.cookies?.[ACCESS_COOKIE];
    if (!token) throw new UnauthorizedException({ message: 'AUTH_REQUIRED', error: 'Unauthorized' });

    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token, { secret: process.env.JWT_ACCESS_SECRET });
      if (payload.typ !== 'access') throw new Error('wrong token type');
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        locale: payload.locale,
      };
      (req as Request & { user?: AuthenticatedUser }).user = user;
      return true;
    } catch {
      throw new UnauthorizedException({ message: 'INVALID_TOKEN', error: 'Unauthorized' });
    }
  }
}
