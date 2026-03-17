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
import { CardStatus } from '../../integrations/slash/dto/card.dto';
import {
  PAGINATION_DEFAULTS,
  SORT_DEFAULTS,
  SortOrder,
} from '../../common/constants/pagination.constants';

/**
 * Query DTO for customer cards list.
 * virtualAccountId is always taken from JWT, not from query.
 */
export class CustomerCardQueryDto {
  @ApiPropertyOptional({ enum: CardStatus, description: 'Card status filter' })
  @IsOptional()
  @IsEnum(CardStatus)
  status?: CardStatus;

  @ApiPropertyOptional({
    description: 'Search keyword for card name or last 4 digits',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Card group Slash ID' })
  @IsOptional()
  @IsString()
  cardGroupId?: string;

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
