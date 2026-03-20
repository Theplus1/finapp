import type {
  SpendingConstraintDto,
  UtilizationLimitDto,
} from '../../../integrations/slash/dto/card.dto';

export const CARD_LIST_SPENDING_LIMIT_PRESETS = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'collective',
  'unlimited',
] as const;

export type CardListSpendingLimitPreset =
  (typeof CARD_LIST_SPENDING_LIMIT_PRESETS)[number];

export interface SpendingLimitSnapshot {
  preset: CardListSpendingLimitPreset;
  amount: number;
}

const SLASH_UTIL_PRESETS = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'collective',
] as const;

function isCardListPreset(p: string): p is CardListSpendingLimitPreset {
  return (CARD_LIST_SPENDING_LIMIT_PRESETS as readonly string[]).includes(p);
}

function pickUtilizationLimit(
  constraint: SpendingConstraintDto | undefined | null,
): UtilizationLimitDto | undefined {
  if (!constraint?.spendingRule) {
    return undefined;
  }
  const rule = constraint.spendingRule;
  if (rule.utilizationLimit) {
    return rule.utilizationLimit;
  }
  if (rule.utilizationLimitV2?.length) {
    return rule.utilizationLimitV2[0];
  }
  return undefined;
}

export function buildSpendingLimitSnapshotFromConstraint(
  constraint: SpendingConstraintDto | undefined | null,
): SpendingLimitSnapshot {
  const ul = pickUtilizationLimit(constraint);
  if (!ul) {
    return { preset: 'unlimited', amount: 0 };
  }
  const cents = ul.limitAmount?.amountCents;
  if (cents === undefined || cents === null || cents <= 0) {
    return { preset: 'unlimited', amount: 0 };
  }
  return {
    preset: ul.preset,
    amount: cents / 100,
  };
}

/**
 * Normalize spendingLimit for response: always { preset, amount }.
 */
export function normalizeSpendingLimitForListResponse(
  stored: unknown,
  constraint: SpendingConstraintDto | null | undefined,
): SpendingLimitSnapshot {
  if (stored != null && typeof stored === 'object') {
    const rec = stored as Record<string, unknown>;

    if (
      typeof rec.preset === 'string' &&
      typeof rec.amount === 'number' &&
      !Number.isNaN(rec.amount) &&
      !('isLimited' in rec)
    ) {
      if (isCardListPreset(rec.preset)) {
        return { preset: rec.preset, amount: rec.amount };
      }
    }

    if ('isLimited' in rec) {
      const isLimited = rec.isLimited === true;
      const preset = rec.preset;
      const amountUsd = rec.amountUsd;
      if (
        isLimited &&
        typeof preset === 'string' &&
        (SLASH_UTIL_PRESETS as readonly string[]).includes(preset) &&
        typeof amountUsd === 'number' &&
        !Number.isNaN(amountUsd)
      ) {
        return {
          preset: preset as UtilizationLimitDto['preset'],
          amount: amountUsd,
        };
      }
      if (rec.isLimited === false) {
        return { preset: 'unlimited', amount: 0 };
      }
    }
  }

  return buildSpendingLimitSnapshotFromConstraint(constraint);
}
