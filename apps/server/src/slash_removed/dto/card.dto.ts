export enum CardStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  INACTIVE = 'inactive',
  CLOSED = 'closed',
}

export interface CardDto {
  id: string;
  accountId: string;
  virtualAccountId: string;
  last4: string;
  name: string;
  expiryMonth: string;
  expiryYear: string;
  status: CardStatus;
  isPhysical: boolean;
  isSingleUse: boolean;
  pan?: string;
  cvv?: string;
  cardGroupId?: string;
  createdAt: string;
  spendingConstraint?: SpendingConstraintDto;
  userData?: Record<string, any>;
  cardProductId?: string;
}

export interface SpendingConstraintDto {
  amount?: number;
  currency?: string;
  interval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime';
  categories?: string[];
}

export interface CreateCardDto {
  accountId: string;
  name: string;
  virtualAccountId?: string;
  isSingleUse?: boolean;
  spendingConstraint?: SpendingConstraintDto;
  userData?: Record<string, any>;
  cardProductId?: string;
}

export interface UpdateCardDto {
  name?: string;
  status?: CardStatus;
  userData?: Record<string, any>;
}
