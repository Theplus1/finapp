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
import { TransactionsService } from '../services/transactions.service';
import { TransactionQueryDto } from '../dto/transaction-query.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

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
    return this.transactionsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query() query: TransactionQueryDto) {
    this.logger.log('Getting transaction statistics');
    return this.transactionsService.getStats(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID with details' })
  @ApiParam({ name: 'id', description: 'Transaction Slash ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getById(@Param('id') id: string) {
    this.logger.log(`Getting transaction ${id}`);
    return this.transactionsService.findByIdWithDetails(id);
  }
}
