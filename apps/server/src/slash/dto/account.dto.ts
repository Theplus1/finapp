export interface AccountDto {
  id: string;
  legalEntityId: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface BalanceDto {
  accountId: string;
  available: number;
  current: number;
  currency: string;
  updatedAt: string;
}

export enum VirtualAccountType {
  PRIMARY = 'primary',
  DEFAULT = 'default',
}

export interface VirtualAccountDto {
  id: string;
  name: string;
  accountNumber: string;
  routingNumber: string;
  accountId: string;
  closedAt?: string;
  accountType: VirtualAccountType;
}

export interface VirtualAccountBalanceDto {
  amountCents: number;
}

export interface VirtualAccountSpendDto {
  amountCents: number;
}

export interface CommissionDetailsDto {
  type: 'flatFee' | 'percentage';
  amount: {
    amountCents: number;
  };
  frequency: 'monthly' | 'yearly' | 'oneTime';
  startDate: string;
}

export interface CommissionRuleDto {
  id: string;
  virtualAccountId: string;
  commissionDetails: CommissionDetailsDto;
}

export interface VirtualAccountWithDetailsDto {
  virtualAccount: VirtualAccountDto;
  balance: VirtualAccountBalanceDto;
  spend: VirtualAccountSpendDto;
  commissionRule?: CommissionRuleDto;
}

export interface ListVirtualAccountsResponse {
  items: VirtualAccountWithDetailsDto[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

export interface ListVirtualAccountsQuery {
  cursor?: string;
  accountId?: string;
  includeClosed?: boolean;
}

export interface CreateVirtualAccountDto {
  accountId: string;
  name: string;
}

export interface UpdateVirtualAccountDto {
  name?: string;
}
