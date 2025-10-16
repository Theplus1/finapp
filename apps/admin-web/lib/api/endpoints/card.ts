import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface Card {
  _id: string;
  slashId: string;
  __v: number;
  accountId: string;
  cardGroupName: string;
  createdAt: string;
  expiryMonth: string;
  expiryYear: string;
  isDeleted: boolean;
  isPhysical: boolean;
  isSingleUse: boolean;
  last4: string;
  lastSyncedAt: string;
  legalEntityId: string;
  name: string;
  status: string;
  syncSource: string;
  updatedAt: string;
  virtualAccountId: string;
}

type Params = {
  page: number;
  limit: number;
};

export interface CardsDetailResponse {
  success: true;
  message: string;
  data: Card;
  meta: {
    timestamp: string;
  };
}

export const cardsApi = {
  getCards: async (
    params?: Params
  ): Promise<ApiResponse<Card[]>> => {
    return apiClient.get("/card", { params });
  },
  getCardById: async (id: string): Promise<ApiResponse<Card>> => {
    return await apiClient.get(
      `/card/${id}`
    );
  },
};
