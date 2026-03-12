import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  TransactionDetailedStatus,
  TransactionStatus,
} from '../../integrations/slash/dto/transaction.dto';
import {
  PAGINATION_DEFAULTS,
  SORT_DEFAULTS,
  SortOrder,
} from '../../common/constants/pagination.constants';

/**
 * Query DTO for customer transactions list.
 * virtualAccountId is always taken from JWT, not from query.
 */
export class CustomerTransactionQueryDto {
  @ApiPropertyOptional({ description: 'Card Slash ID' })
  @IsOptional()
  @IsString()
  cardId?: string;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ enum: TransactionDetailedStatus })
  @IsOptional()
  @IsEnum(TransactionDetailedStatus)
  detailedStatus?: TransactionDetailedStatus;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    minimum: PAGINATION_DEFAULTS.MIN_PAGE,
    default: PAGINATION_DEFAULTS.PAGE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(PAGINATION_DEFAULTS.MIN_PAGE)
  page?: number = PAGINATION_DEFAULTS.PAGE;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: PAGINATION_DEFAULTS.MIN_LIMIT,
    maximum: PAGINATION_DEFAULTS.MAX_LIMIT,
    default: PAGINATION_DEFAULTS.LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(PAGINATION_DEFAULTS.MIN_LIMIT)
  @Max(PAGINATION_DEFAULTS.MAX_LIMIT)
  limit?: number = PAGINATION_DEFAULTS.LIMIT;

  @ApiPropertyOptional({ description: 'Sort field', default: SORT_DEFAULTS.FIELD })
  @IsOptional()
  @IsString()
  sortBy?: string = SORT_DEFAULTS.FIELD;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SORT_DEFAULTS.ORDER,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SORT_DEFAULTS.ORDER;
}
