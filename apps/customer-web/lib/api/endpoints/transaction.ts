import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface CardShort {
  slashId: string;
  name: string;
  last4: string;
}

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
  merchantData?: {
    categoryCode: string;
    description: string;
    location: {
      city: string;
      country: string;
      state: string;
      zip: string;
    };
    name: string;
  };
  card: CardShort;
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
  getFacebookVerifyConfirmCode: async (
    id: string
  ): Promise<ApiResponse<{ confirmCode: string }>> => {
    return apiClient.post(`/transaction/${id}/get-confirm-code`);
  },
};
