import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface CardSpendResponse {
  virtualAccountId: string;
  currency: string;
  timezone: string;
  range: ParamsRange;
  days: string[];
  rows: CardSpendRow[];
}

export interface CardSpend {
  virtualAccountId: string;
  currency: string;
  timezone: string;
  range: { from: string; to: string };
  days: string[];
  rows: CardSpendRow[];
}

export interface CardSpendRow {
  cardId: string;
  cardName: string;
  cardLast4: string;
  isTotal: boolean;
  daySpendCents: {
    [key: string]: number;
  };
  totalSpendCents: number;
}

type ParamsRange = {
  from: string;
  to: string;
};

export const cardSpendApi = {
  getCardSpend: async (
    params?: ParamsRange,
  ): Promise<ApiResponse<CardSpendResponse>> => {
    const user = localStorage.getItem("user");
    const virtualAccountId = JSON.parse(user || "{}")?.virtualAccountId;
    return apiClient.get(
      `/virtual-account/${virtualAccountId}/card-spend`,
      { params },
    );
  },
};
