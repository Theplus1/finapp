import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface VirtualAccount {
  virtualAccount: {
    id: string;
    name: string;
    accountNumber: string;
    routingNumber: string;
    slashAccountGroupId: string;
    accountType: "default";
    accountId: string;
  };
  balance: {
    amountCents: number;
  };
  spend: {
    amountCents: number;
  };
  commissionRule?: {
    id: string;
    virtualAccountId: string;
    commissionDetails: {
      type: string;
      takeRate: number;
    };
  };
}

export interface VirtualAccountsListResponse {
  items: VirtualAccount[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

export const virtualAccountsApi = {
  getVirtualAccounts: async (): Promise<
    ApiResponse<VirtualAccountsListResponse>
  > => {
    return apiClient.get("/virtual-account");
  },
  getVirtualAccountById: async (id: string): Promise<ApiResponse<VirtualAccount>> => {
    return apiClient.get(`/virtual-account/${id}`);
  },
};
