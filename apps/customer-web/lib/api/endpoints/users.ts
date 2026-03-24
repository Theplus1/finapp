/**
 * Users API endpoints
 */

export enum RoleUserEnum {
  ADMIN = "admin",
  BOSS = "boss",
  ADS = "ads",
  ACCOUNTANT = "accountant",
}

export interface User {
  accessStatus: string;
  _id: string;
  telegramId: number;
  username: string;
  firstName: string;
  lastName: string;
  isSubscribed: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  virtualAccountId: string;
}

export interface UserBoss {
  id: string;
  username: string;
  role: RoleUserEnum;
  email: string;
  isActive: boolean;
  bossId: string;
  virtualAccountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
}

export interface UsersListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
