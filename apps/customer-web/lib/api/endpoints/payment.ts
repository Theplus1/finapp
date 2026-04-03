import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface PaymentResponse {
  virtualAccountId: string;
  currency: string;
  timezone: string;
  range: {
    from: string;
    to: string;
  };
  rows: PaymentRow[];
  summary: PaymentSummary;
}

export interface Payment {
  virtualAccountId: string;
  currency: string;
  range: { from: string; to: string };
  rows: PaymentRow[];
  summary: PaymentSummary;
}

export interface PaymentSummary {
  totalDepositCents: number;
  totalSpendCents: number;
  totalSpendUsCents: number;
  totalSpendNonUsCents: number;
  totalRefundCents: number;
  endingAccountBalanceCents: number;
}

export interface PaymentRow {
  date: string;
  depositCents: number;
  spendCents: number;
  spendNonUsCents: number;
  spendUsCents: number;
  refundCents: number;
  accountBalanceCents: number;
}

type Params = {
  from: string;
  to: string;
};

export const paymentApi = {
  getPayments: async (
    params?: Params,
  ): Promise<ApiResponse<PaymentResponse>> => {
    const user = localStorage.getItem("user");
    const virtualAccountId = JSON.parse(user || "{}")?.virtualAccountId;
    return apiClient.get(
      `/virtual-account/${virtualAccountId}/payment-summary`,
      { params },
    );
  },
  getOverallPayments: async (): Promise<ApiResponse<PaymentResponse>> => {
    const user = localStorage.getItem("user");
    const virtualAccountId = JSON.parse(user || "{}")?.virtualAccountId;
    return apiClient.get(
      `/virtual-account/${virtualAccountId}/payment-summary/overall`,
    );
  },
};
