/**
 * Users API endpoints
 */

import { RoleUserEnum } from "./users";
import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export enum EmployeeDrawerTypeEnum {
  CREATE = "create",
  EDIT = "edit",
}
export interface Employee {
  id: string;
  username: string;
  role: string;
  email: string;
  isActive: boolean;
  permissions: string[];
  bossId: string;
  virtualAccountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeData {
  username: string;
  password: string;
  permissions: string[];
  virtualAccountId?: string;
  confirmPassword?: string;
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
    data: Partial<CreateEmployeeData>,
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
