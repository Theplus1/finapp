/**
 * Transaction entity for transformation from Slash API DTO
 */

import { Expose, Transform, Type } from 'class-transformer';
import { MerchantDTO } from '../dto/merchant.dto';
import { SYNC_CONSTANTS, SyncSource } from '../constants/sync.constants';
import { OriginalCurrencyDto } from '../dto/original-currency.dto';

export class TransactionEntity {
  @Expose({ name: 'id' })
  @Transform(({ value }) => value, { toClassOnly: true })
  slashId: string;

  @Expose()
  @Transform(({ value }) => value || SYNC_CONSTANTS.DEFAULT_LEGAL_ENTITY_ID, { toClassOnly: true })
  virtualAccountId: string;

  @Expose()
  accountId: string;

  @Expose()
  cardId?: string;

  @Expose()
  amountCents: number;

  @Transform(({ obj }) => obj.originalCurrency?.code, { toClassOnly: true })
  currency: string;

  @Expose()
  originalCurrency: OriginalCurrencyDto;

  @Expose()
  description?: string;

  @Transform(() => SYNC_CONSTANTS.DEFAULT_NOTE)
  note: string;

  @Expose()
  status: string;

  @Expose()
  type: string;

  @Expose()
  @Type(() => Date)
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  date: Date;

  @Expose()
  @Type(() => MerchantDTO)
  merchantData: MerchantDTO;

  @Expose()
  metadata?: Record<string, any>;

  @Expose()
  @Type(() => Date)
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  createdAt: Date;

  @Transform(({ obj }) => new Date(obj.settledAt || obj.createdAt), { toClassOnly: true })
  updatedAt: Date;

  syncSource: SyncSource;

  constructor(partial: Partial<TransactionEntity> = {}) {
    Object.assign(this, partial);
  }
}
