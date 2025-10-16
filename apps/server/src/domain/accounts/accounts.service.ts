import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { VirtualAccountRepository } from '../../database/repositories/virtual-account.repository';
import { VirtualAccountDocument } from '../../database/schemas/virtual-account.schema';
import { PaginationOptions, RepositoryQuery } from '../../common/types/repository-query.types';
import { SortOrder } from '../../common/constants/pagination.constants';

export interface AccountStats {
  total: number;
  byStatus: Record<string, number>;
  totalBalance: number;
  totalAvailableBalance: number;
}

export interface LinkAccountResult {
  slashId: string;
  name: string;
  linkedTelegramId: number;
  linkedUserId?: string;
  linkedAt: Date;
  linkedBy?: string;
}

export interface AccountFilters {
  accountId?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private readonly virtualAccountRepository: VirtualAccountRepository,
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
   */
  async findAllWithFilters(
    filters: AccountFilters,
    pagination: PaginationOptions,
  ): Promise<[VirtualAccountDocument[], number]> {
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
    return Promise.all([
      this.virtualAccountRepository.find(query),
      this.virtualAccountRepository.count(mongoFilter),
    ]);
  }

  /**
   * Build MongoDB filter from account filters
   * Private method to encapsulate query building logic
   */
  private buildMongoFilter(filters: AccountFilters): any {
    const mongoFilter: any = {
      isDeleted: false, // Always filter out deleted accounts
    };

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
   * Find virtual account by Telegram ID
   */
  async findByTelegramId(telegramId: number): Promise<VirtualAccountDocument | null> {
    return this.virtualAccountRepository.findByLinkedTelegramId(telegramId);
  }

  /**
   * Find all linked accounts
   */
  async findLinked(): Promise<VirtualAccountDocument[]> {
    return this.virtualAccountRepository.findLinked();
  }

  /**
   * Find all unlinked accounts
   */
  async findUnlinked(): Promise<VirtualAccountDocument[]> {
    return this.virtualAccountRepository.findUnlinked();
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
   * Link virtual account to user
   */
  async linkToUser(
    id: string,
    telegramId: number,
    userId?: string,
    linkedBy?: string,
  ): Promise<LinkAccountResult> {
    // Check if account exists
    const account = await this.virtualAccountRepository.findById(id);
    if (!account) {
      throw new NotFoundException(`Virtual account ${id} not found`);
    }

    // Check if account is already linked
    if (account.linkedTelegramId) {
      throw new BadRequestException(
        `Virtual account is already linked to telegram ID ${account.linkedTelegramId}`
      );
    }

    // Check if user already has a linked account
    const userHasAccount = await this.virtualAccountRepository.hasLinkedAccount(telegramId);
    if (userHasAccount) {
      throw new BadRequestException(
        `Telegram ID ${telegramId} already has a linked virtual account`
      );
    }

    // Link the account
    const linkedAccount = await this.virtualAccountRepository.linkToUser(
      id,
      telegramId,
      userId,
      linkedBy,
    );

    if (!linkedAccount) {
      throw new NotFoundException(`Failed to link virtual account ${id}`);
    }

    this.logger.log(`Linked virtual account ${id} to telegram ID ${telegramId}`);

    return {
      slashId: linkedAccount.slashId,
      name: linkedAccount.name,
      linkedTelegramId: linkedAccount.linkedTelegramId!,
      linkedUserId: linkedAccount.linkedUserId,
      linkedAt: linkedAccount.linkedAt!,
      linkedBy: linkedAccount.linkedBy,
    };
  }

  /**
   * Unlink virtual account from user
   */
  async unlinkFromUser(id: string): Promise<VirtualAccountDocument> {
    const account = await this.virtualAccountRepository.findById(id);
    if (!account) {
      throw new NotFoundException(`Virtual account ${id} not found`);
    }

    if (!account.linkedTelegramId) {
      throw new BadRequestException('Virtual account is not linked to any user');
    }

    const unlinkedAccount = await this.virtualAccountRepository.unlinkFromUser(id);
    
    if (!unlinkedAccount) {
      throw new NotFoundException(`Failed to unlink virtual account ${id}`);
    }

    this.logger.log(`Unlinked virtual account ${id}`);

    return unlinkedAccount;
  }

  /**
   * Check if user has linked account
   */
  async hasLinkedAccount(telegramId: number): Promise<boolean> {
    return this.virtualAccountRepository.hasLinkedAccount(telegramId);
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
}
