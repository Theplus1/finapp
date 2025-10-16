import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionDetailedStatus, TransactionStatus } from 'src/integrations/slash/types';
import { PAGINATION_DEFAULTS, SORT_DEFAULTS, SortOrder } from '../../common/constants/pagination.constants';

export class TransactionQueryDto {
  @ApiPropertyOptional({ description: 'Virtual Account ID' })
  @IsOptional()
  @IsString()
  virtualAccountId?: string;

  @ApiPropertyOptional({ description: 'Account ID' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Card ID' })
  @IsOptional()
  @IsString()
  cardId?: string;

  @ApiPropertyOptional({ description: 'Legal Entity ID' })
  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @ApiPropertyOptional({ enum: TransactionStatus, description: 'Transaction status' })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ enum: TransactionDetailedStatus, description: 'Detailed transaction status' })
  @IsOptional()
  @IsEnum(TransactionDetailedStatus)
  detailedStatus?: TransactionDetailedStatus;

  @ApiPropertyOptional({ description: 'Start date (ISO string or Unix timestamp)' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string or Unix timestamp)' })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Search term (description, merchant)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: PAGINATION_DEFAULTS.MIN_PAGE, default: PAGINATION_DEFAULTS.PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(PAGINATION_DEFAULTS.MIN_PAGE)
  page?: number = PAGINATION_DEFAULTS.PAGE;

  @ApiPropertyOptional({ description: 'Items per page', minimum: PAGINATION_DEFAULTS.MIN_LIMIT, maximum: PAGINATION_DEFAULTS.MAX_LIMIT, default: PAGINATION_DEFAULTS.LIMIT })
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

  @ApiPropertyOptional({ description: 'Sort order', enum: SortOrder, default: SORT_DEFAULTS.ORDER })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SORT_DEFAULTS.ORDER;
}
