import {
  Controller,
  Get,
  Query,
  Param,
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
import { TransactionQueryDto } from '../dto/transaction-query.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TransactionsService } from '../../domain/transactions/transactions.service';
import { createPaginatedResponse } from '../../common/dto/api-response.dto';

@ApiTags('Admin API - Transactions')
@ApiBearerAuth()
@Controller('admin-api/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(@Query() query: TransactionQueryDto) {
    this.logger.log('Listing transactions');
    
    const [data, total] = await this.transactionsService.findAllWithFilters(
      {
        virtualAccountId: query.virtualAccountId,
        cardId: query.cardId,
        status: query.status,
        startDate: query.startDate,
        endDate: query.endDate,
      },
      {
        page: query.page || 1,
        limit: query.limit || 20,
      }
    );
    
    return createPaginatedResponse(
      data,
      query.page || 1,
      query.limit || 20,
      total,
      'Transactions retrieved successfully'
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query() query: TransactionQueryDto) {
    this.logger.log('Getting transaction statistics');
    
    return this.transactionsService.getStatsWithFilters({
      virtualAccountId: query.virtualAccountId,
      cardId: query.cardId,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID with details' })
  @ApiParam({ name: 'id', description: 'Transaction Slash ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getById(@Param('id') id: string) {
    this.logger.log(`Getting transaction ${id}`);
    return this.transactionsService.findBySlashIdWithDetails(id);
  }
}
