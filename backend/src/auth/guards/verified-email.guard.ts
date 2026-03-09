import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id?: string } }>();
    const userPayload = request.user;
    if (!userPayload?.id) {
      throw new ForbiddenException('User context missing');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userPayload.id },
      select: { emailVerified: true },
    });
    if (!user?.emailVerified) {
      throw new ForbiddenException('Email must be verified to perform this action');
    }
    return true;
  }
}

