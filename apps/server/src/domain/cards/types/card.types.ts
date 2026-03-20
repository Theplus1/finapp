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

export interface CardCvvHistoryItem {
  name: string;
  gettedAt: string;
}

/**
 * Card with populated virtual account relation
 */
export interface CardWithRelations extends Omit<Card, 'toObject'> {
  virtualAccount?: VirtualAccountInfo | null;
  cardGroup?: CardGroupInfo | null;
  // true when status === paused (card locked).
  isLocked: boolean;
  cvvHistories: CardCvvHistoryItem[];
}
