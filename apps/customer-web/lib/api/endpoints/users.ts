/**
 * Users API endpoints
 */

export enum PermissionEnum {
  TRANSACTIONS = "transactions",
  TRANSACTIONS_FULL = "transactions_full",
  CARD_LIST_OWN = "card_list_own",
  CARD_LIST_ALL = "card_list_all",
  PAYMENTS = "payments",
  CARD_SPEND = "card_spend",
}

export const PERMISSION_LABELS: Record<PermissionEnum, string> = {
  [PermissionEnum.TRANSACTIONS]: "Transactions (merchant ẩn)",
  [PermissionEnum.TRANSACTIONS_FULL]: "Transactions (xem merchant luôn)",
  [PermissionEnum.CARD_LIST_OWN]: "Card list (thẻ của mình)",
  [PermissionEnum.CARD_LIST_ALL]: "Card list (tất cả thẻ)",
  [PermissionEnum.PAYMENTS]: "Payments",
  [PermissionEnum.CARD_SPEND]: "Card Spend",
};

export enum RoleUserEnum {
  ADMIN = "admin",
  BOSS = "boss",
  ADS = "ads",
  ACCOUNTANT = "accountant",
  EMPLOYEE = "employee",
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
