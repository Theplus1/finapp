import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransactionQueryDto } from '../dto/transaction-query.dto';
import { AdminTransactionExportQueryDto } from '../dto/transaction-export-query.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { TransactionsService } from '../../domain/transactions/transactions.service';
import { ExportsService } from '../../domain/exports/exports.service';
import {
  PAGINATION_DEFAULTS,
  SortOrder,
} from '../../common/constants/pagination.constants';
import { ADMIN_API_ROLES } from '../../common/constants/auth.constants';

type AdminTransactionFilterInput = Pick<
  TransactionQueryDto,
  | 'virtualAccountId'
  | 'cardId'
  | 'status'
  | 'detailedStatus'
  | 'startDate'
  | 'endDate'
  | 'sortBy'
  | 'sortOrder'
>;

@ApiTags('Admin API - Transactions')
@ApiBearerAuth()
@Controller('admin-api/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_API_ROLES)
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly exportsService: ExportsService,
  ) {}

  private buildAdminTransactionFilters(
    query: AdminTransactionFilterInput,
  ): {
    virtualAccountId?: string;
    cardId?: string;
    status?: string;
    detailedStatus?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: SortOrder;
  } {
    return {
      virtualAccountId: query.virtualAccountId,
      cardId: query.cardId,
      status: query.status,
      detailedStatus: query.detailedStatus,
      startDate: query.startDate,
      endDate: query.endDate,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List transactions with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(@Query() query: TransactionQueryDto) {
    this.logger.log('Listing transactions');

    const [data, total] = await this.transactionsService.findAllWithFiltersAndPagination(
      this.buildAdminTransactionFilters(query),
      {
        page: query.page || PAGINATION_DEFAULTS.PAGE,
        limit: query.limit || PAGINATION_DEFAULTS.LIMIT,
      },
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

  @Post('export')
  @ApiOperation({
    summary: 'Export transactions (Excel) with the same filters as GET list',
  })
  @ApiResponse({ status: 200, description: 'Export generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportTransactions(
    @Query() query: AdminTransactionExportQueryDto,
    @Request() req: { user?: { userId: string } },
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: Date;
  }> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Missing user ID for export');
    }
    this.logger.log('Admin export transactions');
    return this.exportsService.generateTransactionExportDownloadUrlForAdmin({
      adminUserId: userId,
      filters: this.buildAdminTransactionFilters(query),
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
