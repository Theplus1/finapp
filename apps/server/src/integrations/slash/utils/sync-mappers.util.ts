/**
 * Mapper utilities to transform Slash API DTOs to local entity data
 * Using class-transformer for type-safe, automated mapping
 */

import { plainToInstance } from 'class-transformer';
import { CardDto } from '../dto/card.dto';
import { CardGroupDto } from '../dto/card-group.dto';
import { TransactionDto } from '../dto/transaction.dto';
import { VirtualAccountDto, VirtualAccountWithDetailsDto } from '../dto/account.dto';
import { SyncSource } from '../constants/sync.constants';
import { CardEntity } from '../entities/card.entity';
import { CardGroupEntity } from '../entities/card-group.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { VirtualAccountEntity, VirtualAccountWithDetailsEntity } from '../entities/virtual-account.entity';
import { Card } from '../../../database/schemas/card.schema';
import { CardGroup } from '../../../database/schemas/card-group.schema';
import { Transaction } from '../../../database/schemas/transaction.schema';
import { VirtualAccount } from '../../../database/schemas/virtual-account.schema';

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

/**
 * Map CardGroupDto to CardGroup entity data using class-transformer
 * Uses class-transformer for consistent transformation
 */
export function mapCardGroupDtoToEntity(
  cardGroupDto: CardGroupDto,
  syncSource: SyncSource,
): Partial<CardGroup> {
  const entity = plainToInstance(CardGroupEntity, cardGroupDto, {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
  });
  
  entity.syncSource = syncSource;
  
  return entity as Partial<CardGroup>;
}
