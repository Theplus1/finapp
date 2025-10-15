import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { VirtualAccountRepository } from '../../slash/repositories/virtual-account.repository';
import { VirtualAccountDocument } from '../../slash/schemas/virtual-account.schema';
import { VirtualAccountQueryDto } from '../dto/virtual-account-query.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { SlashService } from '../../slash/slash.service';
import { CreateVirtualAccountDto, UpdateVirtualAccountDto } from '../../slash/dto/account.dto';
import { LinkAccountResponseDto } from '../dto/link-account.dto';

export interface AccountStats {
  total: number;
  byStatus: Record<string, number>;
  totalBalance: number;
  totalAvailableBalance: number;
}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private readonly virtualAccountRepo: VirtualAccountRepository,
    private readonly slashService: SlashService,
  ) {}

  /**
   * Get virtual accounts with filters and pagination
   */
  async findAll(query: VirtualAccountQueryDto): Promise<PaginatedResponseDto<VirtualAccountDocument>> {
    this.logger.log(`Finding virtual accounts with query: ${JSON.stringify(query)}`);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    
    // Get all virtual accounts (repository doesn't support filtering)
    const allAccounts = await this.virtualAccountRepo.findAll();
    
    // Manual filtering
    let filtered = allAccounts;
    
    if (query.accountId) {
      filtered = filtered.filter(va => va.accountId === query.accountId);
    }
    
    if (query.status) {
      filtered = filtered.filter(va => va.status === query.status);
    }
    
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(va => 
        va.name?.toLowerCase().includes(searchLower) ||
        va.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const data = filtered.slice(skip, skip + limit);
    const total = filtered.length;

    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Get single virtual account by ID
   */
  async findById(id: string): Promise<VirtualAccountDocument> {
    const account = await this.virtualAccountRepo.findBySlashId(id);
    
    if (!account) {
      throw new NotFoundException(`Virtual account ${id} not found`);
    }

    return account;
  }

  /**
   * Get virtual account with balance details from Slash API
   */
  async findByIdWithDetails(id: string): Promise<any> {
    const localAccount = await this.findById(id);
    
    // Fetch latest data from Slash API
    try {
      const slashAccount = await this.slashService.getVirtualAccount(id);
      
      const accountData = localAccount.toObject();
      return {
        ...accountData,
        liveBalance: slashAccount.balance,
        lastSynced: new Date(),
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch live data for account ${id}: ${error.message}`);
      return localAccount;
    }
  }

  /**
   * Create a new virtual account (proxy to Slash API)
   */
  async create(dto: CreateVirtualAccountDto): Promise<VirtualAccountDocument> {
    this.logger.log(`Creating virtual account: ${JSON.stringify(dto)}`);

    // Call Slash API to create virtual account
    const slashAccount = await this.slashService.createVirtualAccount(dto);

    // Save to local DB
    const account = await this.virtualAccountRepo.create({
      slashId: slashAccount.id,
      accountId: slashAccount.accountId,
      legalEntityId: 'default', // Update based on your logic
      name: slashAccount.name,
      description: 'Created via admin',
      currency: 'USD',
      balanceCents: 0,
      availableBalanceCents: 0,
      pendingBalanceCents: 0,
      status: 'active',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      syncSource: 'manual',
    });

    return account;
  }

  /**
   * Update virtual account (proxy to Slash API)
   */
  async update(id: string, dto: UpdateVirtualAccountDto): Promise<VirtualAccountDocument> {
    this.logger.log(`Updating virtual account ${id}: ${JSON.stringify(dto)}`);

    // Update in Slash API
    const updated = await this.slashService.updateVirtualAccount(id, dto);

    // Update local DB
    await this.virtualAccountRepo.upsert(id, {
      name: updated.name,
      updatedAt: new Date(),
    });

    return this.findById(id);
  }

  /**
   * Get virtual account statistics
   */
  async getStats(filters: Partial<VirtualAccountQueryDto>): Promise<AccountStats> {
    const accounts = await this.virtualAccountRepo.findAll();

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
   * Link virtual account to user (by MongoDB ID)
   */
  async linkToUser(
    id: string,
    telegramId: number,
    userId?: string,
    linkedBy?: string,
  ): Promise<LinkAccountResponseDto> {
    // Check if account exists
    const account = await this.virtualAccountRepo.findById(id);
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
    const userHasAccount = await this.virtualAccountRepo.hasLinkedAccount(telegramId);
    if (userHasAccount) {
      throw new BadRequestException(
        `Telegram ID ${telegramId} already has a linked virtual account`
      );
    }

    // Link the account
    const linkedAccount = await this.virtualAccountRepo.linkToUser(
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
   * Unlink virtual account from user (by MongoDB ID)
   */
  async unlinkFromUser(id: string): Promise<VirtualAccountDocument> {
    const account = await this.virtualAccountRepo.findById(id);
    if (!account) {
      throw new NotFoundException(`Virtual account ${id} not found`);
    }

    if (!account.linkedTelegramId) {
      throw new BadRequestException('Virtual account is not linked to any user');
    }

    const unlinkedAccount = await this.virtualAccountRepo.unlinkFromUser(id);
    
    if (!unlinkedAccount) {
      throw new NotFoundException(`Failed to unlink virtual account ${id}`);
    }

    this.logger.log(`Unlinked virtual account ${id}`);

    return unlinkedAccount;
  }

  /**
   * Find all linked accounts
   */
  async findLinked(): Promise<VirtualAccountDocument[]> {
    return this.virtualAccountRepo.findLinked();
  }

  /**
   * Find all unlinked accounts
   */
  async findUnlinked(): Promise<VirtualAccountDocument[]> {
    return this.virtualAccountRepo.findUnlinked();
  }

}
