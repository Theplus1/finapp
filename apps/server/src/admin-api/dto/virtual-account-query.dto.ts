import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PAGINATION_DEFAULTS, SORT_DEFAULTS, SortOrder } from '../../common/constants/pagination.constants';
import { CommissionRuleDto } from 'src/integrations/slash/dto/account.dto';

export enum VirtualAccountStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  SUSPENDED = 'suspended',
}

export class VirtualAccountQueryDto {
  @ApiPropertyOptional({ description: 'Account ID' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Legal Entity ID' })
  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @ApiPropertyOptional({ enum: VirtualAccountStatus, description: 'Virtual account status' })
  @IsOptional()
  @IsEnum(VirtualAccountStatus)
  status?: VirtualAccountStatus;

  @ApiPropertyOptional({ description: 'Search term (name, description)' })
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
