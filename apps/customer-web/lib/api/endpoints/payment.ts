import { apiClient } from "../client";
import type { ApiResponse } from "../client";

export interface Payment {
  virtualAccountId: string;
  currency: string;
  range: { from: string; to: string };
  rows: {
    date: string;
    depositCents: number;
    spendCents: number;
    spendNonUsCents: number;
    spendUsCents: number;
    refundCents: number;
    accountBalanceCents: number;
  }[];
  summary: {
    totalDepositCents: number;
    totalSpendCents: number;
    totalSpendUsCents: number;
    totalSpendNonUsCents: number;
    totalRefundCents: number;
    endingAccountBalanceCents: number;
  };
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
  month: string;
};

export interface PaymentDetailResponse {
  success: true;
  message: string;
  data: Payment;
  meta: {
    timestamp: string;
  };
}

export const paymentApi = {
  getPayments: async (params?: Params): Promise<ApiResponse<Payment[]>> => {
    return apiClient.get("/payment", { params });
  },
  getPaymentById: async (id: string): Promise<ApiResponse<Payment>> => {
    return await apiClient.get(`/payment/${id}`);
  },
};
