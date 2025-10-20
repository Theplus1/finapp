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
import {
  LinkAccountDto,
  LinkAccountResponseDto,
} from '../dto/link-account.dto';
import { AccountsService } from '../../domain/accounts/accounts.service';
import { SlashApiService } from '../../integrations/slash/services/slash-api.service';
import { PAGINATION_DEFAULTS } from '../../common/constants/pagination.constants';

@ApiTags('Admin API - Virtual Accounts')
@ApiBearerAuth()
@Controller('admin-api/virtual-accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);

  constructor(
    private readonly accountsService: AccountsService,
    private readonly slashApiService: SlashApiService,
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
  @ApiParam({ name: 'id', description: 'Virtual Account ID' })
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
    @Request() req: any,
  ): Promise<LinkAccountResponseDto> {
    this.logger.log(
      `Linking virtual account ${id} to telegram ID ${dto.telegramId}`,
    );
    return this.accountsService.linkToUser(
      id,
      dto.telegramId,
      dto.userId,
      req.user.username,
    );
  }

  @Delete(':id/link')
  @ApiOperation({
    summary: 'Unlink virtual account from user',
    description: 'Remove the link between a virtual account and user',
  })
  @ApiParam({ name: 'id', description: 'Virtual Account ID' })
  @ApiResponse({ status: 200, description: 'Account unlinked successfully' })
  @ApiResponse({ status: 404, description: 'Virtual account not found' })
  async unlinkAccount(@Param('id') id: string) {
    this.logger.log(`Unlinking virtual account ${id}`);
    return this.accountsService.unlinkFromUser(id);
  }
}
