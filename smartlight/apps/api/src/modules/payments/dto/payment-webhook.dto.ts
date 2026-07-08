/**
 * Webhook payload DTOs.
 *
 * Each provider has its own wire format; we validate after the gateway does
 * signature verification. These classes document the expected shape and let
 * NestJS bind the raw request to a typed object.
 */
export interface MomoCallbackPayload {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number | string;
  orderInfo?: string;
  orderType?: string;
  transId: number | string;
  resultCode: number | string;
  message: string;
  payType?: string;
  responseTime?: number | string;
  extraData?: string;
  signature: string;
}

export interface VNPayCallbackPayload {
  vnp_TmnCode: string;
  vnp_Amount: string;
  vnp_BankCode?: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_PayDate?: string;
  vnp_OrderInfo?: string;
  vnp_TransactionNo?: string;
  vnp_TransactionStatus?: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
  vnp_ResponseCode?: string;
  [k: string]: unknown;
}

export interface PayPalCallbackPayload {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    amount?: { total?: string; currency?: string };
    custom_id?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}