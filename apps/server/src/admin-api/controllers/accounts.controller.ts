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

@ApiTags('Admin API - Virtual Accounts')
@ApiBearerAuth()
@Controller('admin-api/virtual-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super-admin')
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);

  constructor(
    private readonly accountsService: AccountsService,
    private readonly slashApiService: SlashApiService,
    private readonly usersService: UsersService,
    private readonly adminAuthService: AdminAuthService,
    private readonly adminUsersService: AdminUsersService,
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

    const virtualAccount = await this.accountsService.validateAccountExists(id);

    if (telegramId != null) {
      // Check if user already has a linked account
      const existingUser = await this.usersService.findByTelegramIdOrIds(telegramId);
      if (existingUser?.virtualAccountId) {
        throw new BadRequestException(
          `Telegram ID ${telegramId} already has a linked virtual account: ${existingUser.virtualAccountId}`,
        );
      }

      // Link account to user (single source of truth)
      await this.usersService.unlinkAllAccount(virtualAccount.slashId);
      await this.usersService.linkAccountNumber(telegramId, virtualAccount.slashId);
      this.logger.log(`Successfully linked account ${id} to telegram ID ${telegramId}`);
      return {
        slashId: virtualAccount.slashId,
        name: virtualAccount.name,
        linkedTelegramId: telegramId,
        linkedAt: new Date(),
      };
    }
    await this.usersService.linkAccountNumbers(telegramIds!, virtualAccount.slashId);
    this.logger.log(
      `Successfully linked account ${id} to telegram IDs ${telegramIds!.join(',')}`,
    );
    return {
      slashId: virtualAccount.slashId,
      name: virtualAccount.name,
      linkedTelegramIds: telegramIds!,
      linkedAt: new Date(),
    };
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
}
