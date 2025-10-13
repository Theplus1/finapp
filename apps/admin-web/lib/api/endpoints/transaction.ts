import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface Transition {
  id: string;
  accountId: string;
  virtualAccountId: string;
  amountCents: number;
  cardId: string;
  date: string;
  accountSubtype: string;
  description: string;
  merchantDescription: string;
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
  status: string;
  detailedStatus: string;
  originalCurrency: {
    amountCents: number;
    code: string;
    conversionRate: number;
  };
  orderId: string;
  referenceNumber: string;
  authorizedAt: string;
  providerAuthorizationId: string;
}

export interface TransactionsListResponse {
  items: Transition[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

type Params = {
  cursor?: string;
};

export const transactionsApi = {
  getTransactions: async (
    params?: Params
  ): Promise<ApiResponse<TransactionsListResponse>> => {
    return apiClient.get("/transaction", { params });
  },
};
