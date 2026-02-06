/**
 * Card Group DTOs based on Slash API documentation
 * https://docs.slash.com/api-reference/schema-card-group
 */

export interface SpendingRuleDto {
  utilizationLimit?: {
    timezone: string;
    limitAmount: {
      amountCents: number;
    };
    preset: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'collective';
    startDate?: string;
  };
  utilizationLimitV2?: Array<{
    timezone: string;
    limitAmount: {
      amountCents: number;
    };
    preset: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'collective';
    startDate?: string;
  }>;
  transactionSizeLimit?: {
    minimum?: {
      amountCents: number;
    };
    maximum?: {
      amountCents: number;
    };
  };
}

export interface MerchantCategoryRuleDto {
  merchantCategories: string[];
  restriction: 'allowlist' | 'blocklist';
}

export interface MerchantRuleDto {
  merchants: string[];
  restriction: 'allowlist' | 'blocklist';
}

export interface CountryRuleDto {
  countries: string[];
  restriction: 'allowlist' | 'blocklist';
}

export interface MerchantCategoryCodeRuleDto {
  merchantCategoryCodes: string[];
  restriction: 'allowlist' | 'blocklist';
}

export interface CardGroupSpendingConstraintDto {
  merchantCategoryRule?: MerchantCategoryRuleDto;
  merchantRule?: MerchantRuleDto;
  spendingRule?: SpendingRuleDto;
  countryRule?: CountryRuleDto;
  merchantCategoryCodeRule?: MerchantCategoryCodeRuleDto;
}

export interface CardGroupDto {
  id: string;
  name: string;
  virtualAccountId: string;
  spendingConstraint?: CardGroupSpendingConstraintDto;
}

export interface CreateCardGroupDto {
  name: string;
  virtualAccountId: string;
  spendingConstraint?: CardGroupSpendingConstraintDto;
}

export interface UpdateCardGroupDto {
  name?: string;
  spendingConstraint?: CardGroupSpendingConstraintDto;
}

export interface ListCardGroupsQuery {
  cursor?: string;
  'filter:name'?: string;
}
