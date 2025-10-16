import { CardGroupDocument } from '../../../database/schemas/card-group.schema';

/**
 * Minimal virtual account info for card response
 */
export interface VirtualAccountInfo {
  slashId: string;
  name: string;
}

/**
 * Card with populated virtual account relation
 */
export interface CardGroupWithRelations extends Omit<CardGroupDocument, 'toObject'> {
  virtualAccount?: VirtualAccountInfo | null;
}
