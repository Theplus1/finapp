import { Card } from '../../../database/schemas/card.schema';

/**
 * Minimal virtual account info for card response
 */
export interface VirtualAccountInfo {
  slashId: string;
  name: string;
}

/**
 * Minimal card group info for card response
 */
export interface CardGroupInfo {
  slashId: string;
  name: string;
}

/**
 * Card with populated virtual account relation
 */
export interface CardWithRelations extends Omit<Card, 'toObject'> {
  virtualAccount?: VirtualAccountInfo | null;
  cardGroup?: CardGroupInfo | null;
}
