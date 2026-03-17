import type { AdminUserRole } from '../../database/schemas/admin-user.schema';

export const AUTH_AUDIENCE_TYPES = ['admin', 'customer'] as const;
export type AuthAudienceType = (typeof AUTH_AUDIENCE_TYPES)[number];

export const ADMIN_API_ROLES = ['admin', 'super-admin'] as const satisfies readonly AdminUserRole[];
export const CUSTOMER_API_ROLES = ['boss', 'ads', 'accountant'] as const satisfies readonly AdminUserRole[];
/** Chỉ boss và ads được dùng API cards (list/lock/unlock/limit); kế toán không. */
export const CARDS_API_ROLES = ['boss', 'ads'] as const satisfies readonly AdminUserRole[];
export const BOSS_ONLY_ROLES = ['boss'] as const satisfies readonly AdminUserRole[];
export const BOSS_AND_ACCOUNTANT_ROLES = ['boss', 'accountant'] as const satisfies readonly AdminUserRole[];

export function isAdminApiRole(role: AdminUserRole): role is (typeof ADMIN_API_ROLES)[number] {
  return (ADMIN_API_ROLES as readonly AdminUserRole[]).includes(role);
}

