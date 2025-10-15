import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus, TransactionDetailedStatus } from '../../slash/dto/transaction.dto';

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

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
