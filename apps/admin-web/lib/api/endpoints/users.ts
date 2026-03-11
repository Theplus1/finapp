/**
 * Users API endpoints
 */

import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export enum TypeUserEnum {
  CUSTOMER = "customer",
  ADMIN = "admin",
}

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
  role: RoleUserEnum;
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

export const usersApi = {
  /**
   * Get all users (paginated)
   */
  getUsers: async (params?: UsersListParams): Promise<ApiResponse<User[]>> => {
    return apiClient.get<User[]>("/users", {
      params: params as Record<string, string | number | boolean>,
    });
  },

  /**
   * Get user by ID
   */
  getUserById: async (id: string): Promise<ApiResponse<User>> => {
    return apiClient.get<User>(`/users/${id}`);
  },

  /**
   * Update user
   */
  updateUser: async (
    id: string,
    data: BodyInit,
  ): Promise<ApiResponse<User>> => {
    return apiClient.put<User>(`/users/${id}`, data);
  },

  /**
   * Delete user
   */
  deleteUser: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/users/${id}`);
  },
};
