import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../admin-api/guards/jwt-auth.guard';
import { Roles } from '../../admin-api/decorators/roles.decorator';
import { RolesGuard } from '../../admin-api/guards/roles.guard';
import { TransactionsService } from '../../domain/transactions/transactions.service';
import { SlashApiService } from '../../integrations/slash/services/slash-api.service';
import { ConfirmCodeRevealRepository } from '../../database/repositories/confirm-code-reveal.repository';
import { CustomerTransactionQueryDto } from '../dto/transaction-query.dto';
import { PAGINATION_DEFAULTS } from '../../common/constants/pagination.constants';
import type { TransactionWithRelations } from '../../domain/transactions/types/transaction.types';
import type { TransactionDto } from '../../integrations/slash/dto/transaction.dto';

const FACEBOOK_VERIFY_AMOUNT_CENTS = -100;

interface RequestUser {
  userId: string;
  username: string;
  role: string;
  virtualAccountId?: string;
  bossId?: string;
}

@ApiTags('Customer API - Transactions')
@ApiBearerAuth()
@Controller('customer-api/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('boss', 'ads', 'accountant')
export class CustomerTransactionsController {
  private readonly logger = new Logger(CustomerTransactionsController.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly slashApiService: SlashApiService,
    private readonly confirmCodeRevealRepository: ConfirmCodeRevealRepository,
  ) {}

  private getVirtualAccountId(req: { user?: RequestUser }): string {
    const vaId = req.user?.virtualAccountId;
    if (!vaId) {
      throw new ForbiddenException('No virtual account linked to this user');
    }
    return vaId;
  }

  @Get()
  @ApiOperation({ summary: 'List transactions for the current VA' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no VA linked' })
  async list(
    @Query() query: CustomerTransactionQueryDto,
    @Request() req: { user?: RequestUser },
  ): Promise<{
    data: TransactionWithRelations[];
    pagination: { page: number; limit: number; total: number };
  }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const role = req.user?.role;
    this.logger.log(`Listing transactions for VA ${virtualAccountId}, role=${role}`);

    const filters = {
      virtualAccountId,
      cardId: query.cardId,
      status: query.status,
      detailedStatus: query.detailedStatus,
      startDate: query.startDate,
      endDate: query.endDate,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      ...(role === 'ads' ? { amountCents: FACEBOOK_VERIFY_AMOUNT_CENTS } : {}),
    };

    const [data, total] = await this.transactionsService.findAllWithFiltersAndPagination(
      filters,
      {
        page: query.page ?? PAGINATION_DEFAULTS.PAGE,
        limit: query.limit ?? PAGINATION_DEFAULTS.LIMIT,
      },
    );

    return {
      data,
      pagination: {
        page: query.page ?? PAGINATION_DEFAULTS.PAGE,
        limit: query.limit ?? PAGINATION_DEFAULTS.LIMIT,
        total,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by Slash ID' })
  @ApiParam({ name: 'id', description: 'Transaction Slash ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - transaction not in your VA' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getById(
    @Param('id') id: string,
    @Request() req: { user?: RequestUser },
  ): Promise<TransactionWithRelations> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const item = await this.transactionsService.findBySlashIdAndVirtualAccountId(
      id,
      virtualAccountId,
    );
    if (!item) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return item;
  }

  @Post(':id/get-confirm-code')
  @ApiOperation({
    summary: 'Get Facebook verify confirm code (first-click-wins)',
    description:
      'Only for transactions with amountCents === -100. First user to call gets the code; others see who revealed it.',
  })
  @ApiParam({ name: 'id', description: 'Transaction Slash ID' })
  @ApiResponse({ status: 200, description: 'Confirm code or reveal info returned' })
  @ApiResponse({ status: 400, description: 'Not a Facebook verify transaction (-100)' })
  @ApiResponse({ status: 403, description: 'Forbidden - transaction not in your VA' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getConfirmCode(
    @Param('id') transactionSlashId: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{
    transactionId: string;
    confirmCode: string | null;
    revealedByYou: boolean;
    revealInfo?: { revealedBy: string; revealedAt: string };
  }> {
    const virtualAccountId = this.getVirtualAccountId(req);
    const userId = req.user?.userId ?? '';
    const username = req.user?.username ?? '';
    if (!userId) {
      throw new ForbiddenException('User context missing');
    }

    let transactionDto: TransactionDto;
    try {
      transactionDto = await this.slashApiService.getTransaction(transactionSlashId);
    } catch {
      throw new NotFoundException(`Transaction ${transactionSlashId} not found`);
    }

    if (transactionDto.virtualAccountId !== virtualAccountId) {
      throw new ForbiddenException('Transaction not in your virtual account');
    }
    if (transactionDto.amountCents !== FACEBOOK_VERIFY_AMOUNT_CENTS) {
      throw new BadRequestException(
        'Confirm code is only available for Facebook verify transactions (amount -$1.00)',
      );
    }

    const existing = await this.confirmCodeRevealRepository.findByTransactionSlashId(
      transactionSlashId,
    );

    const confirmCodeValue: string | null =
      transactionDto.merchantData?.description ?? null;

    if (existing) {
      return {
        transactionId: transactionSlashId,
        confirmCode: confirmCodeValue,
        revealedByYou: existing.revealedByUserId === userId,
        revealInfo: {
          revealedBy: existing.revealedByUsername,
          revealedAt: existing.revealedAt.toISOString(),
        },
      };
    }

    await this.confirmCodeRevealRepository.create({
      transactionSlashId,
      revealedByUserId: userId,
      revealedByUsername: username,
    });
    this.logger.log(
      `Confirm code revealed for transaction ${transactionSlashId} by ${username}`,
    );
    return {
      transactionId: transactionSlashId,
      confirmCode: confirmCodeValue,
      revealedByYou: true,
    };
  }
}
