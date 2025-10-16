import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CardQueryDto } from '../dto/card-query.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CardsService } from '../../domain/cards/cards.service';
import { PAGINATION_DEFAULTS } from '../../common/constants/pagination.constants';

@ApiTags('Admin API - Cards')
@ApiBearerAuth()
@Controller('admin-api/cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  private readonly logger = new Logger(CardsController.name);

  constructor(
    private readonly cardsService: CardsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List cards with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Cards retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(@Query() query: CardQueryDto) {
    this.logger.log('Listing cards');
    
    const [data, total] = await this.cardsService.findAllWithFilters(
      {
        ...query
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
