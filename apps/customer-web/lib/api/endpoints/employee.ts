/**
 * Users API endpoints
 */

import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface Employee {
  id: string;
  username: string;
  role: "ads" | "accountant";
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
  role: "ads" | "accountant";
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
};
