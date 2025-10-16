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
import { PAGINATION_DEFAULTS } from '../../common/constants/pagination.constants';

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
