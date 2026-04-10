import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export enum DrawerTypeVirtualAccountEnum {
  LINK_TELEGRAM = "link-telegram",
  SET_ACCOUNT = "set-account",
  RESET_PASSWORD = "reset-password",
  RECHARGE = "recharge",
  RECHARGE_HISTORY = "recharge-history",
}

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
  internalBalanceCents: number;
  createdAt: string;
  currency: string;
  description: string;
  isDeleted: boolean;
  lastSyncedAt: string;
  legalEntityId: string;
  name: string;
  pendingBalanceCents: number;
  internalSpendCents: number;
  internalTransferCents: number;
  internalDepositCents: number;
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
  bossEmail?: string;
  bossUsername?: string;
  bossId?: string;
  isHidden?: boolean;
  balanceAlertEnabled?: boolean;
  balanceAlertThresholdUsd?: number;
}

export interface ResetPasswordResponse {
  success: true;
  message: string;
  data: {
    username: string;
    newPassword: string;
  };
  meta: {
    timestamp: string;
  };
}

type Params = {
  page: number;
  limit: number;
  date?: string;
  includeHidden?: boolean;
};

export interface DataRechargeHistory {
  id: string;
  date: string;
  amountCents: number;
  currency: string;
  createdAt: string;
}

export interface VirtualAccountsRechargeHistoryResponse {
  virtualAccountId: string;
  data: DataRechargeHistory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const virtualAccountsApi = {
  getVirtualAccounts: async (
    params?: Params,
  ): Promise<ApiResponse<VirtualAccount[]>> => {
    return apiClient.get("/virtual-account", { params });
  },
  getVirtualAccountById: async (
    id: string,
  ): Promise<ApiResponse<VirtualAccount>> => {
    return await apiClient.get(`/virtual-account/${id}`);
  },
  linkTelegram: async (
    virtualAccountId: string,
    body: { telegramIds: number[] },
  ): Promise<ApiResponse<VirtualAccount>> => {
    return await apiClient.post(
      `/virtual-account/${virtualAccountId}/link`,
      body,
    );
  },
  setAccount: async (
    virtualAccountId: string,
    body: { username: string; password: string },
  ): Promise<ApiResponse<VirtualAccount>> => {
    return await apiClient.post(
      `/virtual-account/${virtualAccountId}/set-account`,
      body,
    );
  },
  addVaToBoss: async (bossId: string, vaId: string): Promise<ApiResponse<any>> => {
    return await apiClient.patch(`/virtual-account/boss/${bossId}/add-va`, { vaId });
  },
  removeVaFromBoss: async (bossId: string, vaId: string): Promise<ApiResponse<any>> => {
    return await apiClient.patch(`/virtual-account/boss/${bossId}/remove-va`, { vaId });
  },
  updateBoss: async (
    bossId: string,
    body: { username?: string; email?: string; password?: string },
  ): Promise<ApiResponse<any>> => {
    return await apiClient.patch(`/virtual-account/boss/${bossId}`, body);
  },
  deleteBoss: async (bossId: string): Promise<ApiResponse<any>> => {
    return await apiClient.delete(`/virtual-account/boss/${bossId}`);
  },
  resetPassword: async (
    username: string,
  ): Promise<ApiResponse<ResetPasswordResponse>> => {
    return await apiClient.post(`/auth/users/${username}/reset-password`);
  },
  dailyDeposit: async (
    virtualAccountId: string,
    body: { date: string; depositAmount: number },
  ): Promise<ApiResponse<VirtualAccount>> => {
    return await apiClient.post(
      `/virtual-account/${virtualAccountId}/deposits`,
      body,
    );
  },
  getDailyDeposit: async (
    virtualAccountId: string,
    params: Params,
  ): Promise<ApiResponse<VirtualAccountsRechargeHistoryResponse>> => {
    return await apiClient.get(
      `/virtual-account/${virtualAccountId}/deposits`,
      { params },
    );
  },
  deleteDailyDeposit: async (
    virtualAccountId: string,
    historyId: string,
  ): Promise<ApiResponse<VirtualAccount>> => {
    return await apiClient.delete(
      `/virtual-account/${virtualAccountId}/deposits/${historyId}`,
    );
  },
  setHidden: async (
    virtualAccountId: string,
    isHidden: boolean,
  ): Promise<ApiResponse<{ slashId: string; isHidden: boolean }>> => {
    return await apiClient.patch(
      `/virtual-account/${virtualAccountId}/hidden`,
      { isHidden },
    );
  },
  setBalanceAlert: async (
    virtualAccountId: string,
    enabled: boolean,
    thresholdUsd?: number,
  ): Promise<
    ApiResponse<{
      slashId: string;
      balanceAlertEnabled: boolean;
      balanceAlertThresholdUsd: number;
    }>
  > => {
    return await apiClient.patch(
      `/virtual-account/${virtualAccountId}/balance-alert`,
      { enabled, thresholdUsd },
    );
  },
};
