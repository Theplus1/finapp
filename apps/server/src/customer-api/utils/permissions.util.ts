import { ForbiddenException } from '@nestjs/common';
import type { RequestUser } from './va-access.util';

// Grandfather fallback permissions for legacy users whose `permissions`
// array is empty. These mirror the pre-refactor role-based behaviour so
// that existing users (e.g. Son1111=ads) keep the exact access they had
// before the refactor, without forcing the boss to re-configure them.
const LEGACY_ADS_PERMISSIONS: readonly string[] = [
  'card_list_own',
  'transactions',
];

const LEGACY_ACCOUNTANT_PERMISSIONS: readonly string[] = [
  'transactions_full',
  'card_list_own',
  'card_list_all',
  'payments',
  'card_spend',
];

/**
 * Returns the effective permissions of a request user. Falls back to
 * legacy role-derived permissions when the `permissions` array is empty
 * so old ads/accountant users keep working without a data migration.
 */
export function getEffectivePermissions(user: RequestUser | undefined): string[] {
  if (!user) return [];
  const explicit = user.permissions ?? [];
  if (explicit.length > 0) return explicit;
  if (user.role === 'ads') return [...LEGACY_ADS_PERMISSIONS];
  if (user.role === 'accountant') return [...LEGACY_ACCOUNTANT_PERMISSIONS];
  return [];
}

export function hasPermission(user: RequestUser | undefined, perm: string): boolean {
  if (!user) return false;
  if (user.role === 'boss') return true;
  return getEffectivePermissions(user).includes(perm);
}

export function hasAnyPermission(
  user: RequestUser | undefined,
  perms: readonly string[],
): boolean {
  if (!user) return false;
  if (user.role === 'boss') return true;
  const effective = getEffectivePermissions(user);
  return perms.some((p) => effective.includes(p));
}

export function requirePermission(user: RequestUser | undefined, perm: string): void {
  if (!hasPermission(user, perm)) {
    throw new ForbiddenException(`Missing permission: ${perm}`);
  }
}

export function requireAnyPermission(
  user: RequestUser | undefined,
  perms: readonly string[],
): void {
  if (!hasAnyPermission(user, perms)) {
    throw new ForbiddenException(
      `Missing one of permissions: ${perms.join(', ')}`,
    );
  }
}
