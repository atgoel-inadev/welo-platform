import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { TokenPayload } from '../dto/auth.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'welo-secret-key-change-in-production',
    });
  }

  async validate(payload: TokenPayload) {
    const user = await this.authService.validateUser(payload.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
