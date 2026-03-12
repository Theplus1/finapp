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
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { CardGroupsService } from '../../domain/card-groups/card-groups.service';
import { PAGINATION_DEFAULTS } from '../../common/constants/pagination.constants';

@ApiTags('Admin API - Card Groups')
@ApiBearerAuth()
@Controller('admin-api/card-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super-admin')
export class CardGroupsController {
  private readonly logger = new Logger(CardGroupsController.name);

  constructor(
    private readonly cardGroupsService: CardGroupsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List card groups with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Card groups retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(@Query() query: CardGroupQueryDto) {
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
