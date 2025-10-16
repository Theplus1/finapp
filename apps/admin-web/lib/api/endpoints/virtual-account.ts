import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface VirtualAccount {
  _id: string;
  slashId: string;
  __v: number;
  accountId: string;
  availableBalanceCents: number;
  balanceCents: number;
  createdAt: string;
  currency: string;
  description: string;
  isDeleted: boolean;
  lastSyncedAt: string;
  legalEntityId: string;
  name: string;
  pendingBalanceCents: number;
  status: string;
  syncSource: string;
  updatedAt: string;
  linkedAt: string;
  linkedBy: string;
  linkedTelegramId: string;
}

export interface VirtualAccountsDetailResponse {
  success: true;
  message: string;
  data: VirtualAccount;
  meta: {
    timestamp: string;
  };
}

export const virtualAccountsApi = {
  getVirtualAccounts: async (): Promise<
    ApiResponse<VirtualAccount[]>
  > => {
    return apiClient.get("/virtual-account");
  },
  getVirtualAccountById: async (
    id: string
  ): Promise<ApiResponse<VirtualAccount>> => {
    return await apiClient.get(`/virtual-account/${id}`);
  },
};
