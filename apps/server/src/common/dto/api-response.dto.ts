import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard API Response wrapper
 * All API endpoints should return data in this format
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
 */
export class PaginatedApiResponseDto<T = any> extends ApiResponseDto<T[]> {
  @ApiProperty({ description: 'Pagination metadata' })
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Helper function to create success response
 */
export function createSuccessResponse<T>(
  data: T,
  message: string = 'Success',
  meta?: any,
): ApiResponseDto<T> {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Helper function to create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Success',
): PaginatedApiResponseDto<T> {
  
  return {
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Helper function to create error response
 */
export function createErrorResponse(
  message: string,
  code?: string,
  details?: any,
): ApiResponseDto {
  return {
    success: false,
    message,
    error: {
      code,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}
