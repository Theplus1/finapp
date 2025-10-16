import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface Transition {
  _id: string;
  slashId: string;
  __v: number;
  accountId: string;
  amountCents: number;
  cardId: string;
  createdAt: string;
  date: string;
  description: string;
  isDeleted: boolean;
  lastSyncedAt: string;
  status: string;
  syncSource: string;
  updatedAt: string;
  virtualAccountId: string;
}

export interface TransactionsListResponse {
  data: Transition[];
  message: string;
  meta: {
    timestamp: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  success: boolean;
}

type Params = {
  page: number;
  limit: number;
};

export const transactionsApi = {
  getTransactions: async (
    params?: Params
  ): Promise<ApiResponse<TransactionsListResponse>> => {
    return apiClient.get("/transaction", { params });
  },
};
