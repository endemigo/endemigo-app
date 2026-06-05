import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Sunucu hatası';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        code = `HTTP_${status}`;
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        // Prefer custom code if present (from ConflictException etc.)
        code = (body.code as string) || `HTTP_${status}`;
        message = Array.isArray(body.message)
          ? (body.message as string[]).join(', ')
          : (body.message as string) || exception.message;
      }
    }

    if (status >= 400) {
      this.logger.error(
        `[${code}] ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const errorResponse: Record<string, any> = {
      code,
      message,
      statusCode: status,
    };

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        for (const [key, val] of Object.entries(body)) {
          if (key !== 'code' && key !== 'message' && key !== 'statusCode') {
            errorResponse[key] = val;
          }
        }
      }
    }

    response.status(status).json({
      success: false,
      error: errorResponse,
      timestamp: new Date().toISOString(),
    });
  }
}
