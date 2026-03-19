import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export enum CardStatus {
  ACTIVE = "active",
  PAUSED = "paused",
}

export enum DrawerCardTypeEnum {
  SET_SPENDING_LIMIT = "set-spending-limit",
  UNSET_SPENDING_LIMIT = "unset-spending-limit",
}

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
  status: CardStatus;
  preRecharge: boolean;
  spendingLimit: {
    preset: LimitPresetEnum;
    amount: number;
  };
  cvvHistories: {
    name: string;
    gettedAt: string;
  }[];
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
  search?: string;
};

export interface CardsDetailResponse {
  success: true;
  message: string;
  data: Card;
  meta: {
    timestamp: string;
  };
}

export enum LimitPresetEnum {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  COLLECTIVE = "collective",
}

export const cardsApi = {
  getCards: async (params?: Params): Promise<ApiResponse<Card[]>> => {
    return apiClient.get("/card", { params });
  },
  getCardsLookup: async (): Promise<ApiResponse<Card[]>> => {
    return await apiClient.get("/card-lookup");
  },
  getCardById: async (id: string): Promise<ApiResponse<Card>> => {
    return await apiClient.get(`/card/${id}`);
  },
  lockCard: async (id: string): Promise<ApiResponse<Card>> => {
    return await apiClient.post(`/card/${id}/lock`);
  },
  unlockCard: async (id: string): Promise<ApiResponse<Card>> => {
    return await apiClient.post(`/card/${id}/unlock`);
  },
  setRecurringOnly: async (id: string): Promise<ApiResponse<Card>> => {
    return await apiClient.post(`/card/${id}/set-recurring-only`);
  },
  unsetRecurringOnly: async (id: string): Promise<ApiResponse<Card>> => {
    return await apiClient.post(`/card/${id}/unset-recurring-only`);
  },
  setLimit: async (
    id: string,
    preset: LimitPresetEnum,
    amount: number,
  ): Promise<ApiResponse<Card>> => {
    return await apiClient.post(`/card/${id}/set-limit`, {
      preset,
      amount,
    });
  },
  unsetLimit: async (id: string): Promise<ApiResponse<Card>> => {
    return await apiClient.post(`/card/${id}/unset-limit`);
  },
  getCardCVV: async (id: string): Promise<ApiResponse<{ cvv: string }>> => {
    return await apiClient.post(`/card/${id}/cvv`);
  },
};
