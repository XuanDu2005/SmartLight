import { apiClient, unwrapPaginated } from './api-client';
import type {
  ListPaymentsAdminParams,
  Paginated,
  PaginatedEnvelope,
  PaymentDetail,
  PaymentSummary,
} from './types';

// ---------------------------------------------------------------------------
//  Server response shapes (api/payments/dto/payment-response.dto.ts)
//
//  Wire DTOs use flat money (`amount: number`, `currency: 'VND'`) but the
//  admin-side `PaymentSummary` type wraps them in `MoneyAmount`. This mapper
//  normalises the wire DTO into the admin shape used by every page.
// ---------------------------------------------------------------------------

type ServerPaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

type ServerPaymentProvider = 'MOMO' | 'VNPAY' | 'PAYPAL' | 'MANUAL';

interface ServerAdminPaymentListItem {
  id: string;
  orderId: string;
  userId: string;
  provider: ServerPaymentProvider;
  status: ServerPaymentStatus;
  amount: number;
  currency: string;
  providerTxnId: string | null;
  createdAt: string;
  succeededAt: string | null;
  failedAt: string | null;
}

interface ServerPaymentTransaction {
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

interface ServerOrderRef {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  grandTotal: number;
  currency: string;
}

interface ServerPaymentDetail {
  id: string;
  orderId: string;
  userId: string;
  provider: ServerPaymentProvider;
  status: ServerPaymentStatus;
  checkoutUrl: string | null;
  totals: { amount: number; currency: string };
  failureReason: string | null;
  providerTxnId: string | null;
  expiresAt: string | null;
  authorizedAt: string | null;
  succeededAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  transactions: ServerPaymentTransaction[];
  order: ServerOrderRef;
}

/** Translate wire DTO status (server) → admin type status. */
const mapStatus = (s: ServerPaymentStatus): string => {
  // Admin types define: PENDING | PROCESSING | SUCCEEDED | FAILED |
  // REFUNDED | CANCELLED. The server additionally has CREATED and uses
  // SUCCESS instead of SUCCEEDED. Normalise here.
  if (s === 'SUCCESS') return 'SUCCEEDED';
  return s;
};

const money = (amount: number, currency: string) => ({ amount, currency });

const summaryFromListItem = (
  raw: ServerAdminPaymentListItem,
): PaymentSummary => ({
  id: raw.id,
  orderId: raw.orderId,
  orderCode: raw.orderId.slice(-8).toUpperCase(), // API doesn't expose order code in list; show last-8 of orderId
  provider: raw.provider,
  amount: money(raw.amount, raw.currency),
  status: mapStatus(raw.status) as PaymentSummary['status'],
  transactionId: raw.providerTxnId,
  createdAt: raw.createdAt,
});

const detailFromServer = (raw: ServerPaymentDetail): PaymentDetail => ({
  id: raw.id,
  orderId: raw.orderId,
  orderCode: raw.order.orderNumber,
  provider: raw.provider,
  amount: money(raw.totals.amount, raw.totals.currency),
  status: mapStatus(raw.status) as PaymentDetail['status'],
  customerId: raw.userId,
  customerName: '',
  customerEmail: null,
  description: null,
  failureReason: raw.failureReason,
  transactionId: raw.providerTxnId,
  transactions: raw.transactions.map((t) => ({
    id: t.id,
    paymentId: t.paymentId,
    type: t.type as 'CHARGE' | 'REFUND' | 'VOID',
    amount: money(t.amount, raw.totals.currency),
    status: t.status as 'SUCCESS' | 'FAILED' | 'PENDING',
    providerReference: t.providerTxnId,
    rawResponse: null,
    createdAt: t.createdAt,
  })),
  webhooks: [],
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

export interface ConfirmOfflinePaymentDto {
  orderId: string;
  referenceCode?: string;
  note?: string;
}

export const paymentsApi = {
  listAdmin: async (
    params: ListPaymentsAdminParams = {},
  ): Promise<Paginated<PaymentSummary>> => {
    const { data } = await apiClient.get('/admin/payments', { params });
    const { items: rawItems, total, page, limit } = unwrapPaginated(data);
    return {
      items: (rawItems as unknown as ServerAdminPaymentListItem[]).map(
        summaryFromListItem,
      ),
      total,
      page,
      limit,
    };
  },

  getAdmin: async (id: string): Promise<PaymentDetail> => {
    const { data } = await apiClient.get<ServerPaymentDetail>(
      `/admin/payments/${id}`,
    );
    return detailFromServer(data);
  },

  /** Admin: confirm an offline payment (bank transfer, COD, etc.) */
  confirmOffline: async (dto: ConfirmOfflinePaymentDto): Promise<unknown> => {
    const { data } = await apiClient.post<unknown>(
      '/admin/payments/confirm',
      dto,
    );
    return data;
  },
};