/**
 * Card entity for transformation from Slash API DTO
 */

import { Expose, Transform, Type } from 'class-transformer';
import { CardDto, SpendingConstraintDto } from '../dto/card.dto';
import { SYNC_CONSTANTS, SyncSource } from '../constants/sync.constants';

export class CardEntity {
  @Expose({ name: 'id' })
  @Transform(({ value }) => value, { toClassOnly: true })
  slashId: string;

  @Expose()
  virtualAccountId: string;

  @Expose()
  accountId: string;

  @Transform(() => SYNC_CONSTANTS.DEFAULT_LEGAL_ENTITY_ID)
  legalEntityId: string;

  @Expose()
  name: string;

  @Expose()
  last4: string;

  @Expose()
  expiryMonth: string;

  @Expose()
  expiryYear: string;

  @Expose()
  status: string;

  @Expose()
  isPhysical: boolean;

  @Expose()
  isSingleUse: boolean;

  @Expose()
  cardGroupId?: string;

  @Transform(() => SYNC_CONSTANTS.DEFAULT_CARD_GROUP_NAME)
  cardGroupName: string;

  @Expose()
  spendingConstraint?: SpendingConstraintDto;

  @Expose()
  @Type(() => Date)
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  createdAt: Date;

  @Transform(({ obj }) => new Date(obj.createdAt), { toClassOnly: true })
  updatedAt: Date;

  syncSource: SyncSource;

  constructor(partial: Partial<CardEntity> = {}) {
    Object.assign(this, partial);
  }
}
