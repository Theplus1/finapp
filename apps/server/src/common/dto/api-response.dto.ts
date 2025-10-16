import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard API Response wrapper
 * All API endpoints return data in this format via ResponseInterceptor
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Response message', example: 'Success' })
  message: string;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({ description: 'Error details', required: false })
  error?: {
    code?: string;
    details?: any;
  };

  @ApiPropertyOptional({ description: 'Response metadata', required: false })
  meta?: {
    timestamp?: string;
    requestId?: string;
    [key: string]: any;
  };
}

/**
 * Paginated response wrapper
 * Controllers return { data, pagination } and ResponseInterceptor wraps it
 */
export class PaginatedApiResponseDto<T = any> extends ApiResponseDto<T[]> {
  @ApiProperty({ description: 'Pagination metadata' })
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
