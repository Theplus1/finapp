import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface VirtualAccount {
  _id: string;
  slashId: string;
  __v: number;
  accountId: string;
  availableBalanceCents: number;
  balanceCents: number;
  balance: {
    amountCents: number;
  };
  createdAt: string;
  currency: string;
  description: string;
  isDeleted: boolean;
  lastSyncedAt: string;
  legalEntityId: string;
  name: string;
  pendingBalanceCents: number;
  spend: {
    amountCents: number;
  };
  status: string;
  syncSource: string;
  updatedAt: string;
  linkedAt?: string;
  linkedBy?: string;
  linkedTelegramId?: number;
  linkedTelegramIds?: number[];
  accountNumber: string;
  routingNumber: string;
}

type Params = {
  page: number;
  limit: number;
};

export interface VirtualAccountsDetailResponse {
  success: true;
  message: string;
  data: VirtualAccount;
  meta: {
    timestamp: string;
  };
}

export const virtualAccountsApi = {
  getVirtualAccounts: async (
    params?: Params
  ): Promise<ApiResponse<VirtualAccount[]>> => {
    return apiClient.get("/virtual-account", { params });
  },
  getVirtualAccountById: async (
    id: string
  ): Promise<ApiResponse<VirtualAccount>> => {
    return await apiClient.get(`/virtual-account/${id}`);
  },
  linkTelegram: async (
    virtualAccountId: string,
    body: { telegramIds: number[] }
  ): Promise<ApiResponse<VirtualAccount>> => {
    return await apiClient.post(
      `/virtual-account/${virtualAccountId}/link`,
      body
    );
  },
};
