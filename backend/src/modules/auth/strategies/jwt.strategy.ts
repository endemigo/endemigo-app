import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { AppRole } from '../../../common/decorators/roles.decorator';
import { UserService } from '../../user/user.service';
import { RC } from '../../../shared/constants/response-codes';

export interface JwtPayload {
  sub: string;
  email: string;
  isSeller: boolean;
  isAdmin?: boolean;
  roles?: AppRole[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: RC.ACCOUNT_DISABLED,
        message: 'Kullanıcı bulunamadı veya devre dışı',
      });
    }

    return {
      id: user.id,
      email: user.email,
      isSeller: user.isSeller,
      isAdmin: payload.isAdmin === true,
      roles: payload.roles,
    };
  }
}
