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
  ApiParam,
} from '@nestjs/swagger';
import { CardsService } from '../services/cards.service';
import { CardQueryDto } from '../dto/card-query.dto';
import { CreateCardDto, UpdateCardDto } from '../../slash/dto/card.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Admin API - Cards')
@ApiBearerAuth()
@Controller('admin-api/cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  private readonly logger = new Logger(CardsController.name);

  constructor(private readonly cardsService: CardsService) {}

  @Get()
  @ApiOperation({ summary: 'List cards with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Cards retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(@Query() query: CardQueryDto) {
    this.logger.log('Listing cards');
    return this.cardsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get card statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query() query: CardQueryDto) {
    this.logger.log('Getting card statistics');
    return this.cardsService.getStats(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get card by ID with details' })
  @ApiParam({ name: 'id', description: 'Card Slash ID' })
  @ApiResponse({ status: 200, description: 'Card retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async getById(@Param('id') id: string) {
    this.logger.log(`Getting card ${id}`);
    return this.cardsService.findByIdWithDetails(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new card' })
  @ApiResponse({ status: 201, description: 'Card created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() dto: CreateCardDto) {
    this.logger.log('Creating card');
    return this.cardsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update card' })
  @ApiParam({ name: 'id', description: 'Card Slash ID' })
  @ApiResponse({ status: 200, description: 'Card updated successfully' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateCardDto) {
    this.logger.log(`Updating card ${id}`);
    return this.cardsService.update(id, dto);
  }
}
