/**
 * Users API endpoints
 */

import { RoleUserEnum } from "./users";
import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface Employee {
  id: string;
  username: string;
  role: RoleUserEnum.ADS | RoleUserEnum.ACCOUNTANT;
  email: string;
  isActive: boolean;
  bossId: string;
  virtualAccountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeData {
  username: string;
  email: string;
  password: string;
  role: RoleUserEnum.ADS | RoleUserEnum.ACCOUNTANT;
  // permission: PermissionEnum[];
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

export const employeeApi = {
  getEmployees: async (
    params?: UsersListParams,
  ): Promise<ApiResponse<{ data: Employee[] }>> => {
    return apiClient.get<{ data: Employee[] }>("/employees", {
      params: params as Record<string, string | number | boolean>,
    });
  },

  createEmployee: async (
    data: CreateEmployeeData,
  ): Promise<ApiResponse<Employee>> => {
    return apiClient.post<Employee>("/employees", data);
  },

  updateEmployee: async (
    id: string,
    data: BodyInit,
  ): Promise<ApiResponse<Employee>> => {
    return apiClient.patch<Employee>(`/employees/${id}`, data);
  },

  deleteEmployee: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/employees/${id}`);
  },
  resetPassword: async (
    id: string,
  ): Promise<ApiResponse<{ newPassword: string }>> => {
    return apiClient.post<{ newPassword: string }>(
      `/employees/${id}/reset-password`,
    );
  },
  activateEmployee: async (
    id: string,
    isActive: boolean,
  ): Promise<ApiResponse<void>> => {
    return apiClient.patch<void>(`/employees/${id}/active`, {
      isActive,
    });
  },
};
