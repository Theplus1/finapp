/**
 * Card Group entity for transformation from Slash API DTO
 */

import { Expose, Transform, Type } from 'class-transformer';
import { CardGroupDto, CardGroupSpendingConstraintDto } from '../dto/card-group.dto';
import { SyncSource } from '../constants/sync.constants';

export class CardGroupEntity {
  @Expose({ name: 'id' })
  @Transform(({ value }) => value, { toClassOnly: true })
  slashId: string;

  @Expose()
  name: string;

  @Expose()
  virtualAccountId: string;

  @Expose()
  spendingConstraint?: CardGroupSpendingConstraintDto;

  @Transform(() => new Date())
  createdAt: Date;

  @Transform(() => new Date())
  updatedAt: Date;

  syncSource: SyncSource;

  constructor(partial: Partial<CardGroupEntity> = {}) {
    Object.assign(this, partial);
  }
}
