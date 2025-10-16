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
export class PaginatedApiResponseDto<T = any> {

  @ApiProperty({ description: 'Response data', isArray: true, type: () => Object })
  data: T[];

  @ApiProperty({ 
    description: 'Pagination metadata',
    example: { page: 1, limit: 10, total: 100 }
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
