import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'default-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, isActive: true },
      });
      if (!user || !user.isActive) {
        this.logger.warn(
          `JWT validation failed: user ${payload.sub} not found or inactive`,
        );
        throw new UnauthorizedException('User not found or inactive');
      }
      return { id: user.id, email: user.email, role: user.role };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(
        `JWT validation error for sub ${payload.sub}`,
        (error as Error)?.stack,
      );
      throw new UnauthorizedException('Invalid token');
    }
  }
}
