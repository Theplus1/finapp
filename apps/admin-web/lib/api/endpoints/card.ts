import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface Card {
  id: string;
  name: string;
  last4: string;
  accountId: string;
  virtualAccountId: string;
  expiryYear: string;
  expiryMonth: string;
  cardGroupId: string;
  createdAt: string;
  isPhysical: boolean;
  isSingleUse: boolean;
  status: string;
  spendingConstraint: {
    merchantCategoryRule: {
      merchantCategories: string[];
      restriction: string;
    };
    merchantRule: {
      merchants: string[];
      restriction: string;
    };
    countryRule: {
      countries: string[];
      restriction: string;
    };
    spendingRule: {
      utilizationLimit: {
        limitAmount: {
          amountCents: number;
        };
        preset: string;
      };
      utilizationLimitV2: [
        {
          limitAmount: {
            amountCents: number;
          };
          preset: string;
        }
      ];
    };
  };
  userData: null;
  cardProductId: string;
}

export interface CardsListResponse {
  items: Card[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

type Params = {
  cursor?: string;
};

export const cardsApi = {
  getCards: async (params?: Params): Promise<ApiResponse<CardsListResponse>> => {
    return apiClient.get("/card", { params });
  },
  getCardById: async (id: string): Promise<ApiResponse<Card>> => {
    return apiClient.get(`/card/${id}`);
  },
};
