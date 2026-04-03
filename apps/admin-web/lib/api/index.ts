/**
 * API Client - Central export point
 * 
 * Usage:
 * import { api } from '@/lib/api'
 * 
 * const response = await api.auth.login({ email, password })
 * const users = await api.users.getUsers({ page: 1, limit: 10 })
 */

export { apiClient } from './client'
export type { ApiResponse, ApiError, RequestConfig } from './client'

// Import all endpoint modules
export { authApi } from './endpoints/auth'
export { usersApi } from './endpoints/users'

// Export types (with explicit re-exports to avoid conflicts)
export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User as AuthUser,
} from './endpoints/auth'

export type {
  User,
  UpdateUserData,
  UsersListParams,
  PaginatedResponse,
} from './endpoints/users'

// Consolidated API object
import { authApi } from './endpoints/auth'
import { usersApi } from './endpoints/users'
import { virtualAccountsApi } from './endpoints/virtual-account'
import { cardsApi } from './endpoints/card'
import { cardGroupsApi } from './endpoints/card-group'
import { transactionsApi } from './endpoints/transaction'
import { paymentApi } from './endpoints/payment'

export const api = {
  auth: authApi,
  users: usersApi,
  virtualAccounts: virtualAccountsApi,
  cards: cardsApi,
  cardGroups: cardGroupsApi,
  transactions: transactionsApi,
  payment: paymentApi,
}
