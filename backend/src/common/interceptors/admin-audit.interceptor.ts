import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import type { CurrentUserPayload } from '../../auth/decorators/current-user.decorator';

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminAuditInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserPayload | undefined;
    const method = request.method;
    const path = request.url?.split('?')[0] ?? request.path;
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      request.socket?.remoteAddress ??
      'unknown';

    const auditMeta = {
      adminId: user?.id,
      email: user?.email,
      method,
      path,
      ip,
      at: new Date().toISOString(),
    };

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `Admin access: ${method} ${path} | adminId=${auditMeta.adminId} ip=${ip}`,
          );
        },
        error: (err) => {
          this.logger.warn(
            `Admin access (error): ${method} ${path} | adminId=${auditMeta.adminId} ip=${ip} | ${err?.message ?? err}`,
          );
        },
      }),
    );
  }
}
