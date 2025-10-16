import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface Transaction {
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
  card: {
    slashId: string;
    name: string;
    last4: string;
  };
  virtualAccount: {
    slashId: string;
    name: string;
  };
}

type Params = {
  page: number;
  limit: number;
};

export const transactionsApi = {
  getTransactions: async (
    params?: Params
  ): Promise<ApiResponse<Transaction[]>> => {
    return apiClient.get("/transaction", { params });
  },
};
