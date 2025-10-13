/**
 * Users API endpoints
 */

import { apiClient } from '../client'
import type { ApiResponse } from '../client'

export interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

export interface UpdateUserData {
  name?: string
  email?: string
}

export interface UsersListParams {
  page?: number
  limit?: number
  search?: string
  role?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const usersApi = {
  /**
   * Get all users (paginated)
   */
  getUsers: async (params?: UsersListParams): Promise<ApiResponse<PaginatedResponse<User>>> => {
    return apiClient.get<PaginatedResponse<User>>('/users', { params: params as Record<string, string | number | boolean> })
  },

  /**
   * Get user by ID
   */
  getUserById: async (id: string): Promise<ApiResponse<User>> => {
    return apiClient.get<User>(`/users/${id}`)
  },

  /**
   * Update user
   */
  updateUser: async (id: string, data: BodyInit): Promise<ApiResponse<User>> => {
    return apiClient.put<User>(`/users/${id}`, data)
  },

  /**
   * Delete user
   */
  deleteUser: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/users/${id}`)
  },
}
