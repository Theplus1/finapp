import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Logger,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { VirtualAccountQueryDto } from '../dto/virtual-account-query.dto';
import { UpdateVirtualAccountDto } from '../../integrations/slash/dto/account.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import {
  LinkAccountDto,
  LinkAccountResponseDto,
} from '../dto/link-account.dto';
import { AccountsService } from '../../domain/accounts/accounts.service';
import { SlashApiService } from '../../integrations/slash/services/slash-api.service';
import { UsersService } from '../../users/users.service';
import { PAGINATION_DEFAULTS } from '../../common/constants/pagination.constants';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminUsersService } from '../../domain/admin-users/admin-users.service';
import { SetBossAccountDto } from '../dto/set-boss-account.dto';
import { AdminUserResponseDto } from '../dto/create-admin.dto';
import { DailyPaymentSummariesService } from '../../domain/daily-payment-summaries/daily-payment-summaries.service';
import { UpsertDepositDto } from '../dto/upsert-deposit.dto';
import { startOfDay, format } from 'date-fns';
import { ADMIN_API_ROLES } from '../../common/constants/auth.constants';
import { parseYyyyMmDdAsUtcDate } from '../../common/utils/date.utils';
import { DepositHistoryRepository } from '../../database/repositories/deposit-history.repository';

@ApiTags('Admin API - Virtual Accounts')
@ApiBearerAuth()
@Controller('admin-api/virtual-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_API_ROLES)
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);

  constructor(
    private readonly accountsService: AccountsService,
    private readonly slashApiService: SlashApiService,
    private readonly usersService: UsersService,
    private readonly adminAuthService: AdminAuthService,
    private readonly adminUsersService: AdminUsersService,
    private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
    private readonly depositHistoryRepository: DepositHistoryRepository,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List virtual accounts with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Virtual accounts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(@Query() query: VirtualAccountQueryDto) {
    this.logger.log('Listing virtual accounts');

    const [data, total] = await this.accountsService.findAllWithFilters(
      {
        accountId: query.accountId,
        status: query.status,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
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

  @Get(':id/deposits')
  @ApiOperation({
    summary: 'List deposit history for virtual account (paginated)',
    description:
      'Returns deposit records for the VA with pagination. Optional `date` (YYYY-MM-DD) filters to a specific day. Use page & limit for infinite scroll (hasMore = page < totalPages).',
  })
  @ApiParam({ name: 'id', description: 'Virtual Account Slash ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter by date (YYYY-MM-DD). If omitted, return all history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit history retrieved successfully',
  })
  async listDeposits(
    @Param('id') slashId: string,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('date') dateStr?: string,
  ): Promise<{
    virtualAccountId: string;
    data: Array<{
      id: string;
      date: string;
      amountCents: number;
      currency: string;
      note?: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const virtualAccount = await this.accountsService.findBySlashId(slashId);

    const page =
      pageRaw !== undefined
        ? Math.max(
            PAGINATION_DEFAULTS.MIN_PAGE,
            Number.isNaN(Number(pageRaw)) ? PAGINATION_DEFAULTS.PAGE : Number(pageRaw),
          )
        : PAGINATION_DEFAULTS.PAGE;

    const limit =
      limitRaw !== undefined
        ? Math.min(
            PAGINATION_DEFAULTS.MAX_LIMIT,
            Math.max(
              PAGINATION_DEFAULTS.MIN_LIMIT,
              Number.isNaN(Number(limitRaw)) ? PAGINATION_DEFAULTS.LIMIT : Number(limitRaw),
            ),
          )
        : PAGINATION_DEFAULTS.LIMIT;

    let forDate: Date | undefined;
    if (dateStr) {
      const parsed = parseYyyyMmDdAsUtcDate(dateStr);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid date filter (must be YYYY-MM-DD)');
      }
      forDate = parsed;
    }

    const [rows, total] =
      await this.depositHistoryRepository.findWithPagination(
        virtualAccount.slashId,
        page,
        limit,
        forDate,
      );

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const data = rows.map((r) => ({
      id: String(r._id),
      date: format(r.date, 'yyyy-MM-dd'),
      amountCents: r.amountCents,
      currency: r.currency,
      note: r.note,
      createdAt: r.createdAt?.toISOString() ?? '',
    }));

    return {
      virtualAccountId: virtualAccount.slashId,
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get virtual account statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats(@Query() query: VirtualAccountQueryDto) {
    this.logger.log('Getting virtual account statistics');
    return this.accountsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get virtual account by ID with live balance' })
  @ApiParam({ name: 'id', description: 'Virtual Account ID' })
  @ApiResponse({
    status: 200,
    description: 'Virtual account retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Virtual account not found' })
  async getById(@Param('id') id: string) {
    this.logger.log(`Getting virtual account ${id}`);

    const localAccount = await this.accountsService.findById(id);

    // Fetch latest data from Slash API
    try {
      const slashAccount = await this.slashApiService.getVirtualAccount(
        localAccount.slashId,
      );

      const accountData = localAccount.toObject();
      return {
        ...accountData,
        liveBalance: slashAccount.balance,
        lastSynced: new Date(),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch live data for account ${id}: ${error.message}`,
      );
      return localAccount;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update virtual account' })
  @ApiParam({ name: 'id', description: 'Virtual Account ID' })
  @ApiResponse({
    status: 200,
    description: 'Virtual account updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Virtual account not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateVirtualAccountDto) {
    this.logger.log(`Updating virtual account ${id}`);
    return this.accountsService.updateAccount(id, dto);
  }

  @Post(':id/link')
  @ApiOperation({
    summary: 'Link virtual account to user',
    description: 'Link a virtual account to a Telegram user',
  })
  @ApiParam({ name: 'id', description: 'Virtual Account Slash ID' })
  @ApiBody({ type: LinkAccountDto })
  @ApiResponse({
    status: 200,
    description: 'Account linked successfully',
    type: LinkAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - user already has an account',
  })
  @ApiResponse({ status: 404, description: 'Virtual account not found' })
  async linkAccount(
    @Param('id') id: string,
    @Body() dto: LinkAccountDto,
  ): Promise<LinkAccountResponseDto> {
    const telegramId = dto.telegramId;
    const telegramIds = dto.telegramIds;
    this.logger.log(
      `Linking virtual account ${id} to ${telegramId != null ? `telegramId=${telegramId}` : `telegramIds=${telegramIds!.join(',')}`}`,
    );

    if (dto.telegramId) {
      // Check if user already has a linked account
      const existingUser = await this.usersService.findByTelegramId(dto.telegramId);
      if (existingUser?.virtualAccountId) {
        throw new Error(`Telegram ID ${dto.telegramId} already has a linked virtual account: ${existingUser.virtualAccountId}`);
      }
      const virtualAccount = await this.accountsService.validateAccountExists(id);
      
      // Link account to user (single source of truth)
      await this.usersService.unlinkAllAccount(virtualAccount.slashId);
      await this.usersService.linkAccountNumber(dto.telegramId, virtualAccount.slashId);
      
      this.logger.log(`Successfully linked account ${id} to telegram ID ${dto.telegramId}`);
      
      return {
        slashId: virtualAccount.slashId,
        name: virtualAccount.name,
        linkedTelegramId: dto.telegramId,
        linkedAt: new Date(),
      };
    } else if (dto.telegramIds) {
      const virtualAccount = await this.accountsService.validateAccountExists(id);
      await this.usersService.linkAccountNumbers(dto.telegramIds, virtualAccount.slashId);
      
      this.logger.log(`Successfully linked account ${id} to telegram ID ${dto.telegramId}`);
      return {
        slashId: virtualAccount.slashId,
        name: virtualAccount.name,
        linkedTelegramIds: dto.telegramIds,
        linkedAt: new Date(),
      };
    }

    throw new Error('Either telegramId or telegramIds must be provided');
  }

  @Delete(':id/link')
  @ApiOperation({
    summary: 'Unlink virtual account from user',
    description: 'Remove the link between a virtual account and user',
  })
  @ApiParam({ name: 'id', description: 'Virtual Account ID' })
  @ApiResponse({ status: 200, description: 'Account unlinked successfully' })
  @ApiResponse({ status: 404, description: 'Virtual account or linked user not found' })
  async unlinkAccount(@Param('id') id: string) {
    this.logger.log(`Unlinking virtual account ${id}`);
    
    // Find user by virtual account ID
    const virtualAccount = await this.accountsService.validateAccountExists(id);
    if (!virtualAccount) {
      throw new Error(`Virtual account ${id} not found`);
    }
    // Unlink account from user
    await this.usersService.unlinkAccount(virtualAccount.slashId);
    
    this.logger.log(`Successfully unlinked account ${id} from virtual account ID ${virtualAccount.slashId}`);
    
    return true;
  }

  @Post(':id/set-account')
  @ApiOperation({
    summary: 'Create boss account for virtual account',
    description: 'Admin creates a boss user (customer owner) for a given virtual account',
  })
  @ApiParam({ name: 'id', description: 'Virtual Account Slash ID' })
  @ApiBody({ type: SetBossAccountDto })
  @ApiResponse({
    status: 201,
    description: 'Boss account created and linked to virtual account successfully',
    type: AdminUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - boss already exists for this virtual account or username taken',
  })
  async setBossAccount(
    @Param('id') slashId: string,
    @Body() dto: SetBossAccountDto,
    @Request() req: { user?: { username?: string } },
  ): Promise<AdminUserResponseDto> {
    this.logger.log(
      `Set boss account for virtual account ${slashId} by ${req.user?.username ?? 'unknown'}`,
    );

    // Here we treat :id as Slash virtual account id
    const virtualAccount = await this.accountsService.findBySlashId(slashId);

    const existingBoss = await this.adminUsersService.findBossByVirtualAccountId(
      virtualAccount.slashId,
    );
    if (existingBoss) {
      throw new BadRequestException(
        `Virtual account ${virtualAccount.slashId} already has a boss user: ${existingBoss.username}`,
      );
    }

    const bossUser = await this.adminAuthService.createAdmin(
      dto.username,
      dto.password,
      'boss',
      dto.email,
      { virtualAccountId: virtualAccount.slashId },
    );

    return {
      id: (bossUser._id as any).toString(),
      username: bossUser.username,
      role: bossUser.role,
      email: bossUser.email,
      isActive: bossUser.isActive,
      lastLoginAt: bossUser.lastLoginAt,
      virtualAccountId: bossUser.virtualAccountId,
      bossId: bossUser.bossId,
      createdAt: bossUser.createdAt,
      updatedAt: bossUser.updatedAt,
    };
  }

  @Post(':id/deposits')
  @ApiOperation({
    summary: 'Upsert daily deposit for virtual account',
    description:
      'Admin sets the total deposit (in USD, major units) for a given virtual account and date',
  })
  @ApiParam({ name: 'id', description: 'Virtual Account Slash ID' })
  @ApiBody({ type: UpsertDepositDto })
  @ApiResponse({
    status: 200,
    description: 'Deposit updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid date or amount',
  })
  async upsertDeposit(
    @Param('id') slashId: string,
    @Body() dto: UpsertDepositDto,
  ): Promise<{ success: true }> {
    this.logger.log(
      `Upsert deposit for virtual account ${slashId} on ${dto.date}`,
    );

    const virtualAccount = await this.accountsService.findBySlashId(slashId);

    const date = parseYyyyMmDdAsUtcDate(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    // Không cho phép ghi nhận nạp tiền ở ngày tương lai
    const today = startOfDay(new Date());
    if (date > today) {
      throw new BadRequestException(
        'Cannot record deposit for a future date. Please use today or a past date.',
      );
    }

    const depositCents = Math.round(dto.depositAmount * 100);
    const currency = 'USD';

    // Write deposit history
    await this.depositHistoryRepository.create({
      virtualAccountId: virtualAccount.slashId,
      date,
      amountCents: depositCents,
      currency,
    });

    // Calculate total deposit for the day from history
    const totalDepositCents =
      await this.depositHistoryRepository.sumByVirtualAccountAndDate(
        virtualAccount.slashId,
        date,
      );

    try {
      await this.dailyPaymentSummariesService.upsertDepositForDate(
        virtualAccount.slashId,
        date,
        totalDepositCents,
        currency,
      );
    } catch (error: any) {
      const message = error?.message ?? '';
      if (
        message.includes('DailyPaymentSummary validation failed') &&
        message.includes('currency') &&
        message.includes('required')
      ) {
        throw new BadRequestException(
          'Deposit currency is required. Please ensure this virtual account has a valid `currency` before recording deposits.',
        );
      }

      throw error;
    }

    return { success: true };
  }

  @Delete(':id/deposits/:historyId')
  @ApiOperation({
    summary: 'Delete a single deposit history record by id',
    description:
      'Admin deletes one deposit history record and recalculates daily_payment_summaries for that day.',
  })
  @ApiParam({ name: 'id', description: 'Virtual Account Slash ID' })
  @ApiParam({ name: 'historyId', description: 'Deposit history document ID' })
  @ApiResponse({
    status: 200,
    description:
      'Deposit history record deleted and daily summary updated',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid or missing date',
  })
  async deleteDepositHistoryForDate(
    @Param('id') slashId: string,
    @Param('historyId') historyId: string,
  ): Promise<{
    success: true;
    deletedId: string;
    virtualAccountId: string;
    date: string;
    totalDepositCents: number;
  }> {
    const virtualAccount = await this.accountsService.findBySlashId(slashId);

    const deletedDoc = await this.depositHistoryRepository.deleteById(
      historyId,
    );
    if (!deletedDoc) {
      throw new BadRequestException('Deposit history not found');
    }

    if (deletedDoc.virtualAccountId !== virtualAccount.slashId) {
      throw new BadRequestException(
        'Deposit history does not belong to this virtual account',
      );
    }

    const date = deletedDoc.date;

    // Recalculate total deposit for the day from remaining history (likely 0)
    const totalDepositCents =
      await this.depositHistoryRepository.sumByVirtualAccountAndDate(
        virtualAccount.slashId,
        date,
      );

    await this.dailyPaymentSummariesService.upsertDepositForDate(
      virtualAccount.slashId,
      date,
      totalDepositCents,
      virtualAccount.currency ?? 'USD',
    );

    return {
      success: true,
      deletedId: historyId,
      virtualAccountId: virtualAccount.slashId,
      date: format(date, 'yyyy-MM-dd'),
      totalDepositCents,
    };
  }
}
