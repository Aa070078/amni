import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from "@nestjs/common";
import type { Response } from "express";
import { map, type Observable } from "rxjs";
import { success } from "@amni/shared";

/**
 * Wraps all successful responses in the shared API envelope:
 * `{ ok: true, data, requestId }`.
 */
@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<Response>();
    const requestId = res.locals.requestId as string | undefined;

    return next.handle().pipe(map((data) => success(data, requestId ?? "")));
  }
}
