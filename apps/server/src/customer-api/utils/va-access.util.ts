import { BadRequestException, ForbiddenException } from '@nestjs/common';

export interface RequestUser {
  userId: string;
  username: string;
  role: string;
  virtualAccountId?: string;
  virtualAccountIds?: string[];
  bossId?: string;
  permissions?: string[];
}

/**
 * Validates that the user has access to the given VA.
 * Boss: checks virtualAccountIds[] (multi-VA support)
 * Employee: checks single virtualAccountId
 */
export function validateVaAccess(user: RequestUser | undefined, slashId: string): void {
  const vaIds = user?.virtualAccountIds?.length
    ? user.virtualAccountIds
    : user?.virtualAccountId
      ? [user.virtualAccountId]
      : [];

  if (vaIds.length === 0) {
    throw new BadRequestException('No virtual account linked to this user');
  }
  if (!vaIds.includes(slashId)) {
    throw new ForbiddenException('You do not have access to this virtual account');
  }
}

/**
 * Gets the first available VA ID from token.
 * Used for endpoints that don't receive explicit vaId.
 */
export function getVaIdFromToken(user: RequestUser | undefined): string {
  const vaId = user?.virtualAccountId;
  if (!vaId) {
    throw new BadRequestException('No virtual account linked to this user');
  }
  return vaId;
}
