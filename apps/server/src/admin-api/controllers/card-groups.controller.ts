import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CardGroupQueryDto } from '../dto/card-group-query.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CardGroupsService } from '../../domain/card-groups/card-groups.service';
import { PAGINATION_DEFAULTS } from '../../common/constants/pagination.constants';
import { PaginatedApiResponseDto } from 'src/common/dto/api-response.dto';
import { CardGroupWithRelations } from '../../domain/card-groups/types/card-groups.types';

@ApiTags('Admin API - Card Groups')
@ApiBearerAuth()
@Controller('admin-api/card-groups')
@UseGuards(JwtAuthGuard)
export class CardGroupsController {
  private readonly logger = new Logger(CardGroupsController.name);

  constructor(
    private readonly cardGroupsService: CardGroupsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List card groups with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Card groups retrieved successfully', type: PaginatedApiResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(@Query() query: CardGroupQueryDto): Promise<PaginatedApiResponseDto<CardGroupWithRelations>> {
    this.logger.log('Listing card groups');
    
    const [data, total] = await this.cardGroupsService.findAllWithFilters(
      {
        virtualAccountId: query.virtualAccountId,
        name: query.name,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      {
        page: query.page || PAGINATION_DEFAULTS.PAGE,
        limit: query.limit || PAGINATION_DEFAULTS.LIMIT,
      }
    );
    
    return {
      data,
      pagination: {
        page: query.page || PAGINATION_DEFAULTS.PAGE,
        limit: query.limit || PAGINATION_DEFAULTS.LIMIT,
        total,
      },
    };
  }
}
