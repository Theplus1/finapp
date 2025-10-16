import { Card } from '../../../database/schemas/card.schema';

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
export interface CardWithRelations extends Omit<Card, 'toObject'> {
  virtualAccount?: VirtualAccountInfo | null;
}
