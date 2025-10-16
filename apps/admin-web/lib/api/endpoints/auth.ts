/**
 * Authentication API endpoints
 */

import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export const authApi = {
  /**
   * Login user
   */
  login: async (credentials: {
    username: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> => {
    return apiClient.post<AuthResponse>("/auth/login", credentials);
  },

  /**
   * Register new user
   */
  register: async (data: BodyInit): Promise<ApiResponse<AuthResponse>> => {
    return apiClient.post<AuthResponse>("/auth/register", data);
  },

  /**
   * Logout user
   */
  logout: async (): Promise<ApiResponse<void>> => {
    return apiClient.post<void>("/auth/logout");
  },

  /**
   * Get current user
   */
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return apiClient.get<User>("/auth/me");
  },

  /**
   * Refresh auth token
   */
  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    return apiClient.post<{ token: string }>("/auth/refresh");
  },

  /**
   * Request password reset
   */
  forgotPassword: async (email: string): Promise<ApiResponse<void>> => {
    return apiClient.post<void>("/auth/forgot-password", { email });
  },

  /**
   * Reset password with token
   */
  resetPassword: async (
    token: string,
    password: string
  ): Promise<ApiResponse<void>> => {
    return apiClient.post<void>("/auth/reset-password", { token, password });
  },
};
