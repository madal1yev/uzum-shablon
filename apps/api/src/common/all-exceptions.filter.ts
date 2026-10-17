import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorBody } from '@marketpix/shared-types';

/** Barcha xatolarni bitta, xavfsiz va prognoz qilinadigan JSON ko'rinishiga keltiradi. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = (res.locals as { requestId?: string }).requestId ?? (req as { id?: string }).id;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string | string[]) ?? message;
        error = (b.error as string) ?? error;
      }
    } else if (exception instanceof Error) {
      // Ichki xato matnini mijozga oshirmaymiz — faqat logga yozamiz.
      this.logger.error(
        { requestId, path: req.path, err: exception.message, stack: exception.stack },
        'Unhandled error',
      );
      message = 'Internal server error';
    }

    const payload: ApiErrorBody = {
      statusCode: status,
      message,
      error,
      requestId,
    };
    res.status(status).json(payload);
  }
}
