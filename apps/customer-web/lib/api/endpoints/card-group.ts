import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface CardGroup {
  _id: string;
  slashId: string;
  spendingConstraint?: {
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
      utilizationLimitV2: {
        limitAmount: {
          amountCents: number;
        };
        preset: string;
      }[];
    };
  };
  __v: number;
  createdAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
  name: string;
  syncSource: string;
  updatedAt: string;
  virtualAccountId: string;
  virtualAccount: {
    slashId: string;
    name: string;
  };
}

export const cardGroupsApi = {
  getCardGroup: async (): Promise<ApiResponse<CardGroup[]>> => {
    return apiClient.get(`/card-groups`);
  },
  getCardGroupById: async (id: string): Promise<ApiResponse<CardGroup>> => {
    return apiClient.get(`/card-groups/${id}`);
  },
};
