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


export interface UtilizationLimitDto {
  timezone?: string;
  limitAmount: { amountCents: number };
  preset: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'collective';
  startDate?: string;
}

export interface SpendingConstraintSpendingRuleDto {
  utilizationLimit?: UtilizationLimitDto;
  utilizationLimitV2?: UtilizationLimitDto[];
  transactionSizeLimit?: {
    minimum?: { amountCents: number };
    maximum?: { amountCents: number };
  };
}

export interface SpendingConstraintDto {
  spendingRule?: SpendingConstraintSpendingRuleDto;
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
  spendingConstraint?: SpendingConstraintDto | null;
  userData?: Record<string, any>;
}
