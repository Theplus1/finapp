import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface Card {
  _id: string;
  slashId: string;
  __v: number;
  accountId: string;
  cardGroupId: string;
  cardGroup: {
    slashId: string;
    name: string;
  };
  createdAt: string;
  expiryMonth: string;
  expiryYear: string;
  isDeleted: boolean;
  isPhysical: boolean;
  isSingleUse: boolean;
  last4: string;
  lastSyncedAt: string;
  name: string;
  status: string;
  syncSource: string;
  updatedAt: string;
  virtualAccountId: string;
  virtualAccount: {
    slashId: string;
    name: string;
  };
}

type Params = {
  page: number;
  limit: number;
};

export const cardsApi = {
  getCards: async (params?: Params): Promise<ApiResponse<Card[]>> => {
    return apiClient.get("/card", { params });
  },
  getCardById: async (id: string): Promise<ApiResponse<Card>> => {
    return await apiClient.get(`/card/${id}`);
  },
};
