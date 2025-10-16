import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CardStatus } from 'src/integrations/slash/types';
import { PAGINATION_DEFAULTS, SORT_DEFAULTS, SortOrder } from '../../common/constants/pagination.constants';

export class CardQueryDto {
  @ApiPropertyOptional({ description: 'Virtual Account ID' })
  @IsOptional()
  @IsString()
  virtualAccountId?: string;

  @ApiPropertyOptional({ description: 'Account ID' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ enum: CardStatus, description: 'Card status' })
  @IsOptional()
  @IsEnum(CardStatus)
  status?: CardStatus;

  @ApiPropertyOptional({ description: 'Card group ID' })
  @IsOptional()
  @IsString()
  cardGroupId?: string;

  @ApiPropertyOptional({ description: 'Is physical card', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPhysical?: boolean;

  @ApiPropertyOptional({ description: 'Is single use card', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isSingleUse?: boolean;

  @ApiPropertyOptional({ description: 'Search term (name, last4)' })
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
