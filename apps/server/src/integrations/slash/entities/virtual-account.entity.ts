/**
 * Virtual Account entity for transformation from Slash API DTO
 */

import { Expose, Transform, Type } from 'class-transformer';
import { CommissionRuleDto, VirtualAccountDto, VirtualAccountWithDetailsDto } from '../dto/account.dto';
import { SYNC_CONSTANTS, SyncSource } from '../constants/sync.constants';

export class VirtualAccountEntity {
  @Expose({ name: 'id' })
  @Transform(({ value }) => value, { toClassOnly: true })
  slashId: string;

  @Expose()
  accountId: string;

  @Transform(() => SYNC_CONSTANTS.DEFAULT_LEGAL_ENTITY_ID)
  legalEntityId: string;

  @Expose()
  name: string;

  @Transform(() => SYNC_CONSTANTS.DEFAULT_DESCRIPTION)
  description: string;

  @Transform(() => SYNC_CONSTANTS.DEFAULT_CURRENCY)
  currency: string;

  @Transform(() => 0)
  balanceCents: number;

  @Transform(() => 0)
  availableBalanceCents: number;

  @Transform(() => 0)
  pendingBalanceCents: number;

  @Transform(() => SYNC_CONSTANTS.DEFAULT_STATUS)
  status: string;

  @Transform(() => ({}))
  metadata: Record<string, any>;

  @Transform(() => new Date())
  createdAt: Date;

  @Transform(() => new Date())
  updatedAt: Date;

  @Expose()
  accountNumber: string;

  @Expose()
  routingNumber: string;



  syncSource: SyncSource;

  constructor(partial: Partial<VirtualAccountEntity> = {}) {
    Object.assign(this, partial);
  }
}

/**
 * Virtual Account entity from detailed response (with balance info)
 */
export class VirtualAccountWithDetailsEntity {
  @Expose({ name: 'virtualAccount.id' })
  @Transform(({ obj }) => obj.virtualAccount?.id, { toClassOnly: true })
  slashId: string;

  @Expose({ name: 'virtualAccount.accountId' })
  @Transform(({ obj }) => obj.virtualAccount?.accountId, { toClassOnly: true })
  accountId: string;

  @Transform(() => SYNC_CONSTANTS.DEFAULT_LEGAL_ENTITY_ID)
  legalEntityId: string;

  @Expose({ name: 'virtualAccount.name' })
  @Transform(({ obj }) => obj.virtualAccount?.name, { toClassOnly: true })
  name: string;

  @Transform(() => SYNC_CONSTANTS.DEFAULT_DESCRIPTION)
  description: string;

  @Transform(() => SYNC_CONSTANTS.DEFAULT_CURRENCY)
  currency: string;

  @Expose({ name: 'balance.amountCents' })
  @Transform(({ obj }) => obj.balance?.amountCents || 0, { toClassOnly: true })
  balanceCents: number;

  @Transform(({ obj }) => obj.balance?.amountCents || 0, { toClassOnly: true })
  availableBalanceCents: number;

  @Transform(() => 0)
  pendingBalanceCents: number;

  @Transform(({ obj }) => obj.virtualAccount?.closedAt ? 'closed' : SYNC_CONSTANTS.DEFAULT_STATUS, { toClassOnly: true })
  status: string;

  @Transform(() => ({}))
  metadata: Record<string, any>;

  @Expose({ name: 'virtualAccount.accountNumber' })
  @Transform(({ obj }) => obj.virtualAccount?.accountNumber, { toClassOnly: true })
  accountNumber: string;

  @Expose({ name: 'virtualAccount.routingNumber' })
  @Transform(({ obj }) => obj.virtualAccount?.routingNumber, { toClassOnly: true })
  routingNumber: string;

  commissionRule: CommissionRuleDto;

  @Transform(() => new Date())
  createdAt: Date;

  @Transform(() => new Date())
  updatedAt: Date;

  syncSource: SyncSource;

  constructor(partial: Partial<VirtualAccountWithDetailsEntity> = {}) {
    Object.assign(this, partial);
  }
}
