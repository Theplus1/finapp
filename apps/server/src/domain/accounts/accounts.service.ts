import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { VirtualAccountRepository } from '../../database/repositories/virtual-account.repository';
import { VirtualAccountDocument } from '../../database/schemas/virtual-account.schema';
import { PaginationOptions, RepositoryQuery } from '../../common/types/repository-query.types';
import { SortOrder } from '../../common/constants/pagination.constants';
import { UsersService } from '../../users/users.service';
import { AdminUsersService } from '../admin-users/admin-users.service';
import { DailyPaymentSummariesService } from '../daily-payment-summaries/daily-payment-summaries.service';
import {
  VirtualAccountDetail,
  AccountStats,
  AccountFilters,
} from './types/account.types';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private readonly virtualAccountRepository: VirtualAccountRepository,
    private readonly usersService: UsersService,
    private readonly adminUsersService: AdminUsersService,
    @Inject(forwardRef(() => DailyPaymentSummariesService))
    private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
  ) {}

  /**
   * Find all virtual accounts
   */
  async findAll(): Promise<VirtualAccountDocument[]> {
    return this.virtualAccountRepository.findAll();
  }

  /**
   * Find all virtual accounts with filters and pagination
   * Optimized: Filters and paginates at database level
   * Enriched: Includes linked user information
   */
  async findAllWithFilters(
    filters: AccountFilters,
    pagination: PaginationOptions,
  ): Promise<[VirtualAccountDetail[], number]> {
    // Build MongoDB filter
    const mongoFilter = this.buildMongoFilter(filters);
    
    // Build sort
    const sortField = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortOrder === SortOrder.ASC ? 1 : -1;
    
    // Build repository query
    const query: RepositoryQuery = {
      filter: mongoFilter,
      skip: (pagination.page - 1) * pagination.limit,
      limit: pagination.limit,
      sort: { [sortField]: sortDirection },
    };

    // Execute at DB level
    const [accounts, total] = await Promise.all([
      this.virtualAccountRepository.find(query),
      this.virtualAccountRepository.count(mongoFilter),
    ]);

    // Enrich accounts with linked user & boss data
    const enrichedAccounts = await this.enrichAccounts(accounts);

    return [enrichedAccounts, total];
  }

  /**
   * Build MongoDB filter from account filters
   * Private method to encapsulate query building logic
   */
  private buildMongoFilter(filters: AccountFilters): any {
    const mongoFilter: any = {
      isDeleted: false, // Always filter out deleted accounts
    };

    // Hide hidden VAs by default unless includeHidden is true
    if (!filters.includeHidden) {
      mongoFilter.isHidden = { $ne: true };
    }

    // Simple equality filters
    if (filters.accountId) {
      mongoFilter.accountId = filters.accountId;
    }

    if (filters.status) {
      mongoFilter.status = filters.status;
    }

    // Complex search filter (OR condition)
    if (filters.search) {
      mongoFilter.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { slashId: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return mongoFilter;
  }

  /**
   * Find virtual account by Slash ID
   */
  async findBySlashId(slashId: string): Promise<VirtualAccountDocument> {
    const account = await this.virtualAccountRepository.findBySlashId(slashId);
    
    if (!account) {
      throw new NotFoundException(`Virtual account ${slashId} not found`);
    }

    return account;
  }

  /**
   * Find virtual account by MongoDB ID
   */
  async findById(id: string): Promise<VirtualAccountDocument> {
    const account = await this.virtualAccountRepository.findById(id);
    
    if (!account) {
      throw new NotFoundException(`Virtual account ${id} not found`);
    }

    return account;
  }


  /**
   * Get account statistics
   */
  async getStats(): Promise<AccountStats> {
    const accounts = await this.virtualAccountRepository.findAll();

    const stats: AccountStats = {
      total: accounts.length,
      byStatus: {},
      totalBalance: 0,
      totalAvailableBalance: 0,
    };

    accounts.forEach((account) => {
      stats.byStatus[account.status] = (stats.byStatus[account.status] || 0) + 1;
      stats.totalBalance += account.balanceCents;
      stats.totalAvailableBalance += account.availableBalanceCents;
    });

    return stats;
  }

  /**
   * Validate that a virtual account exists
   * Used before linking in UsersService
   */
  async validateAccountExists(id: string): Promise<VirtualAccountDocument> {
    const account = await this.virtualAccountRepository.findById(id);
    
    if (!account) {
      throw new NotFoundException(`Virtual account ${id} not found`);
    }

    return account;
  }

  /**
   * Toggle hidden status for a virtual account (admin only)
   */
  async setHidden(slashId: string, isHidden: boolean): Promise<VirtualAccountDocument> {
    const existing = await this.virtualAccountRepository.findBySlashId(slashId);
    if (!existing) {
      throw new NotFoundException(`Virtual account ${slashId} not found`);
    }
    const updated = await this.virtualAccountRepository.upsert(slashId, { isHidden });
    this.logger.log(`Virtual account ${slashId} isHidden=${isHidden}`);
    return updated;
  }

  /**
   * Update virtual account
   * Business logic: Validate and update in local database
   */
  async updateAccount(accountId: string, updateDto: any): Promise<VirtualAccountDocument> {
    this.logger.log(`Updating virtual account ${accountId}: ${JSON.stringify(updateDto)}`);
    
    // Business validation - check if account exists
    const existingAccount = await this.virtualAccountRepository.findBySlashId(accountId);
    if (!existingAccount) {
      throw new NotFoundException(`Virtual account ${accountId} not found`);
    }
    
    // Update in local database
    const updatedAccount = await this.virtualAccountRepository.upsert(accountId, updateDto);
    
    this.logger.log(`Virtual account updated successfully: ${accountId}`);
    
    return updatedAccount;
  }

  /**
   * Enrich virtual accounts with linked user information
   * Follows the same pattern as transaction enrichment
   */
  private async enrichAccounts(
    accounts: VirtualAccountDocument[],
  ): Promise<VirtualAccountDetail[]> {
    if (accounts.length === 0) {
      return [];
    }

    // Extract unique Slash IDs
    const slashIds = [...new Set(accounts.map((a) => a.slashId).filter(Boolean))];

    const [users, bosses] = await Promise.all([
      slashIds.length > 0
        ? this.usersService.findByAccountNumbers(slashIds)
        : Promise.resolve([]),
      slashIds.length > 0
        ? this.adminUsersService.findBossesByVirtualAccountIds(slashIds)
        : Promise.resolve([]),
    ]);

    const userMap = new Map<string, any>();
    users.forEach((user) => {
      if (user.virtualAccountId) {
        userMap.set(user.virtualAccountId, user);
      }
    });

    const bossMap = new Map<string, { username: string; email?: string }>();
    bosses.forEach((boss) => {
      if (boss.virtualAccountId) {
        bossMap.set(boss.virtualAccountId, {
          username: boss.username,
          email: boss.email,
        });
      }
    });

    let internalMetricsMap = new Map<
      string,
      {
        endingAccountBalanceCents: number;
        totalSpendCents: number;
        totalDepositCents: number;
      }
    >();
    try {
      internalMetricsMap =
        await this.dailyPaymentSummariesService.getOverallMetricsByVirtualAccountIds(
          slashIds,
        );
    } catch (error) {
      this.logger.warn(
        `Failed to aggregate internal metrics for admin virtual-account list: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return accounts.map((account) => {
      const accountData = account.toObject();
      const user = userMap.get(account.slashId);
      const boss = bossMap.get(account.slashId);
      const internalMetrics = internalMetricsMap.get(account.slashId);

      const enriched: VirtualAccountDetail = {
        ...accountData,
        linkedTelegramId: user?.telegramId,
        linkedTelegramIds: user?.telegramIds,
        bossUsername: boss?.username,
        bossEmail: boss?.email,
        internalBalanceCents: internalMetrics?.endingAccountBalanceCents ?? 0,
        internalSpendCents: internalMetrics?.totalSpendCents ?? 0,
        internalDepositCents: internalMetrics?.totalDepositCents ?? 0,
        internalTransferCents: accountData.transferNetChange ?? 0,
      };

      return enriched;
    });
  }
}
