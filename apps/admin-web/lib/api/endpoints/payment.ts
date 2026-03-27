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

export interface PaymentOverallResponse {
  virtualAccountId: string;
  currency: string;
  timezone: string;
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
  totalSpendCentsForAdmin: number;
  totalSpendUsCentsForAdmin: number;
  totalSpendNonUsCentsForAdmin: number;
  totalRefundCents: number;
  totalSpendCents: number;
  endingAccountBalanceCents: number;
  endingAccountBalanceCentsForAdmin: number;
}

export interface PaymentRow {
  date: string;
  depositCents: number;
  spendCentsForAdmin: number;
  spendCents: number;
  spendNonUsCentsForAdmin: number;
  spendUsCentsForAdmin: number;
  refundCents: number;
  accountBalanceCentsForAdmin: number;
}

type Params = {
  from: string;
  to: string;
  virtualAccountId: string;
};

export const paymentApi = {
  getPayments: async (
    params: Params,
  ): Promise<ApiResponse<PaymentResponse>> => {
    return apiClient.get(
      `/virtual-account/${params.virtualAccountId}/payment-summary`,
      { params },
    );
  },
  getOverallPayments: async (
    virtualAccountId: string,
  ): Promise<ApiResponse<PaymentOverallResponse>> => {
    return apiClient.get(
      `/virtual-account/${virtualAccountId}/payment-summary/overall`,
    );
  },
};
