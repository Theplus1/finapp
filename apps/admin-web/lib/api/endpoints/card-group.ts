import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface CardGroup {
  id: string;
  name: string;
  virtualAccountId: string;
  spendingConstraint: {
    merchantRule: {
      merchants: string[];
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
}

export interface CardGroupsListResponse {
  items: CardGroup[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

export const cardGroupsApi = {
  getCardGroup: async (): Promise<ApiResponse<CardGroupsListResponse>> => {
    return apiClient.get(`/card-group`);
  },
  getCardGroupById: async (id: string): Promise<ApiResponse<CardGroup>> => {
    return apiClient.get(`/card-group/${id}`);
  },
};
