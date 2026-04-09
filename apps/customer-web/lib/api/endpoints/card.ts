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
  isRecurringOnly: boolean;
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

export enum LimitPresetEnum {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  COLLECTIVE = "collective",
  UNLIMITED = "unlimited",
}

export const cardsApi = {
  getCards: async (params?: Params): Promise<ApiResponse<Card[]>> => {
    return apiClient.get("/card", { params });
  },
  getCardBySlashId: async (slashId: string): Promise<ApiResponse<Card[]>> => {
    return apiClient.get(`/card/by-slash-id/${slashId}`);
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
  getCardCVV: async (id: string): Promise<ApiResponse<{ cvv: string; pan: string; last4: string; expiryMonth: string; expiryYear: string }>> => {
    return await apiClient.post(`/card/${id}/cvv`);
  },
  getCardCVVHistory: async (
    id: string,
    params: Params,
  ): Promise<
    ApiResponse<{
      cardId: string;
      data: {
        revealedAt: string;
        lastRevealedAt: string;
        revealCount: number;
        revealedByUserId: string;
        revealedByUsername: string;
      }[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasMore: boolean;
    }>
  > => {
    return await apiClient.get(`/card/${id}/cvv-history`, { params });
  },
  getCardActivity: async (
    id: string,
    params: Params,
  ): Promise<
    ApiResponse<{
      data: {
        action: string;
        performedByUsername: string;
        performedAt: string;
        details?: Record<string, any>;
      }[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > => {
    return await apiClient.get(`/card/${id}/activity`, { params });
  },
};
