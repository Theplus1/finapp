/**
 * Mapper utilities to transform Slash API DTOs to local entity data
 * Using class-transformer for type-safe, automated mapping
 */

import { plainToInstance } from 'class-transformer';
import { CardDto } from '../dto/card.dto';
import { TransactionDto } from '../dto/transaction.dto';
import { VirtualAccountDto, VirtualAccountWithDetailsDto } from '../dto/account.dto';
import { Card } from '../schemas/card.schema';
import { Transaction } from '../schemas/transaction.schema';
import { VirtualAccount } from '../schemas/virtual-account.schema';
import { SyncSource } from '../constants/sync.constants';
import { CardEntity } from '../entities/card.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { VirtualAccountEntity, VirtualAccountWithDetailsEntity } from '../entities/virtual-account.entity';

/**
 * Map CardDto to Card entity data using class-transformer
 * This eliminates manual field mapping and reduces human error
 */
export function mapCardDtoToEntity(
  cardDto: CardDto,
  syncSource: SyncSource,
): Partial<Card> {
  const entity = plainToInstance(CardEntity, cardDto, {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
  });
  
  entity.syncSource = syncSource;
  
  return entity as Partial<Card>;
}

/**
 * Map TransactionDto to Transaction entity data using class-transformer
 * Handles nested objects, date conversions, and default values automatically
 */
export function mapTransactionDtoToEntity(
  transactionDto: TransactionDto,
  syncSource: SyncSource,
): Partial<Transaction> {
  const entity = plainToInstance(TransactionEntity, transactionDto, {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
  });
  
  entity.syncSource = syncSource;
  
  return entity as Partial<Transaction>;
}

/**
 * Map VirtualAccountDto to VirtualAccount entity data (from webhook)
 * Uses class-transformer for consistent transformation
 */
export function mapVirtualAccountDtoToEntity(
  accountDto: VirtualAccountDto,
  syncSource: SyncSource,
): Partial<VirtualAccount> {
  const entity = plainToInstance(VirtualAccountEntity, accountDto, {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
  });
  
  entity.syncSource = syncSource;
  
  return entity as Partial<VirtualAccount>;
}

/**
 * Map VirtualAccountWithDetailsDto to VirtualAccount entity data (from list API)
 * Handles nested structure with balance information
 */
export function mapVirtualAccountWithDetailsDtoToEntity(
  item: VirtualAccountWithDetailsDto,
  syncSource: SyncSource,
): Partial<VirtualAccount> {
  const entity = plainToInstance(VirtualAccountWithDetailsEntity, item, {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
  });
  
  entity.syncSource = syncSource;
  
  return entity as Partial<VirtualAccount>;
}
