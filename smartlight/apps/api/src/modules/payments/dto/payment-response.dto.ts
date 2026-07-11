/**
 * Payment response DTOs.
 */

export interface PaymentTotalsDto {
  amount: number;
  currency: string;
}

export interface PaymentResponseDto {
  id: string;
  orderId: string;
  userId: string;
  provider: string;
  status: string;
  checkoutUrl: string | null;
  totals: PaymentTotalsDto;
  failureReason: string | null;
  providerTxnId: string | null;
  expiresAt: string | null;
  authorizedAt: string | null;
  succeededAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransactionResponseDto {
  id: string;
  paymentId: string;
  type: string;
  status: string;
  amount: number;
  providerCode: string | null;
  providerMessage: string | null;
  providerTxnId: string | null;
  createdAt: string;
}

export interface PaymentIntentResponseDto {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  provider: string;
  checkoutUrl: string;
  expiresAt: string | null;
}

export interface PaymentSummaryDto {
  id: string;
  orderId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface AdminPaymentListItemDto {
  id: string;
  orderId: string;
  userId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  providerTxnId: string | null;
  createdAt: string;
  succeededAt: string | null;
  failedAt: string | null;
}

export interface AdminPaymentListResponseDto {
  items: AdminPaymentListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface PaymentDetailDto extends PaymentResponseDto {
  transactions: PaymentTransactionResponseDto[];
  order: {
    id: string;
    orderNumber: string;
    userId: string;
    status: string;
    grandTotal: number;
    currency: string;
  };
}
