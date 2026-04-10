import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponseDto } from '../dto/api-response.dto';

/**
 * Global HTTP Exception Filter
 * Catches all HTTP exceptions and formats them consistently
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let errorDetails: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errorCode = responseObj.error || this.getErrorCodeFromStatus(status);
        errorDetails = responseObj.details;

        // Handle validation errors
        if (Array.isArray(responseObj.message)) {
          message = 'Validation failed';
          errorDetails = responseObj.message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse: ApiResponseDto = {
      success: false,
      message,
      error: {
        code: errorCode,
        details: errorDetails,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
    };

    // Security logging: always include IP + user-agent for 401/403/429 on
    // auth-sensitive routes so operators can grep for suspicious activity.
    // Structured log (single line JSON) so log processors can parse it.
    if (status === 401 || status === 403 || status === 429) {
      const isAuthRoute =
        request.url?.includes('/auth/login') ||
        request.url?.includes('/admin-api/') ||
        request.url?.includes('/customer-api/');
      if (isAuthRoute) {
        const clientIp =
          (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          (request.headers['x-real-ip'] as string) ||
          request.ip ||
          request.connection?.remoteAddress ||
          'unknown';
        const userAgent = (request.headers['user-agent'] as string) || 'unknown';
        this.logger.warn(
          `[security] status=${status} path=${request.method} ${request.url} ip=${clientIp} ua="${userAgent.substring(0, 120)}"`,
        );
      }
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      500: 'INTERNAL_ERROR',
    };

    return statusMap[status] || 'UNKNOWN_ERROR';
  }
}
