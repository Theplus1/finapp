import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

/**
 * Response Transform Interceptor
 * Automatically wraps all controller responses in standard format
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponseDto<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(
      map((data) => {
        // Check if response has pagination metadata
        if (data && typeof data === 'object' && 'pagination' in data) {
          const { pagination, ...rest } = data as any;
          return {
            success: true,
            message: 'Success',
            ...rest,
            pagination,
            meta: {
              timestamp: new Date().toISOString(),
            },
          };
        }

        // Otherwise, wrap the response normally
        return {
          success: true,
          message: 'Success',
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
