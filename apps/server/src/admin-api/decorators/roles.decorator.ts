import { SetMetadata } from '@nestjs/common';
import type { AdminUserRole } from '../../database/schemas/admin-user.schema';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AdminUserRole[]) => SetMetadata(ROLES_KEY, roles);

