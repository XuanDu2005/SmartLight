/**
 * Shipping gateway abstraction.
 *
 * The service depends only on this contract; concrete providers (GHN,
 * GHTK, Viettel Post, Ahamove, Grab Express) all implement the same
 * interface so business logic never changes when a new provider is added.
 */
import type { ShippingProvider } from '@prisma/client';

export interface AddressPayload {
  fullName: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  ward?: string | null;
  detail: string | null;
}

export interface ItemPayload {
  productVariantId: string;
  productName: string;
  sku: string;
  weightGrams: number;
  quantity: number;
}

export interface CreateShipmentInput {
  /** Local orderId (used to derive the carrier-side ref). */
  orderId: string;
  /** Human-readable order number. */
  orderNumber: string;
  shipTo: AddressPayload;
  shipFrom: AddressPayload;
  items: ItemPayload[];
  weightGrams: number;
  /** Optional COD amount (0 for pre-paid). */
  codAmount: number;
  shippingFee: number;
  /** Optional customer note forwarded to the provider. */
  notes?: string;
  /** Return URLs for the carrier's hosted flow (if applicable). */
  returnUrl?: string;
}

export interface CreateShipmentResult {
  /** Carrier-assigned order code / shipment id. */
  providerOrderCode: string;
  /** Carrier-assigned tracking number. */
  trackingNumber: string;
  /** URL to printable label (if any). */
  labelUrl?: string;
  /** Estimated delivery datetime (if any). */
  estimatedDeliveryAt?: Date;
  /** Shipping fee quoted by the provider. */
  shippingFee: number;
  /** Raw provider response (for audit / debugging). */
  raw?: Record<string, unknown>;
}

export type CallbackOutcome =
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNED'
  | 'CANCELLED';

export interface CallbackResult {
  outcome: CallbackOutcome;
  /** Tracking number (if provided). */
  trackingNumber?: string;
  /** Provider order code (used to locate the shipment). */
  providerOrderCode?: string;
  /** Provider event id (for idempotency). */
  eventId?: string;
  /** Human-readable message. */
  message?: string;
  /** Free-form location. */
  location?: string;
  /** When the carrier says the event happened. */
  occurredAt?: Date;
  /** Raw callback payload. */
  raw?: Record<string, unknown>;
}

export interface TrackingUpdate {
  status: string;
  location?: string;
  message?: string;
  occurredAt?: Date;
}

export interface FeeEstimateInput {
  shipFrom: AddressPayload;
  shipTo: AddressPayload;
  weightGrams: number;
  codAmount: number;
  serviceCode?: string;
}

export interface FeeEstimateResult {
  fee: number;
  currency: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  serviceCode: string;
  serviceName: string;
  raw?: Record<string, unknown>;
}

export interface ShippingGateway {
  /** Provider code (matches Prisma enum). */
  readonly provider: ShippingProvider;

  /** Display name. */
  readonly displayName: string;

  /** Create a shipment with the carrier. */
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;

  /** Cancel a shipment with the carrier (if supported). */
  cancelShipment(args: {
    providerOrderCode: string;
    reason: string;
  }): Promise<{ ok: boolean; raw?: Record<string, unknown> }>;

  /** Verify a webhook/IPN and translate to a normalized outcome. */
  verifyCallback(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<CallbackResult>;

  /** Fetch latest tracking information (used by `track()` for public lookup). */
  track(args: {
    trackingNumber: string;
  }): Promise<TrackingUpdate[]>;

  /** Estimate shipping fee. */
  estimateFee(input: FeeEstimateInput): Promise<FeeEstimateResult>;
}

/** Maps callback outcome to shipment status. */
export const CALLBACK_TO_SHIPMENT_STATUS: Record<
  CallbackOutcome,
  import('@prisma/client').ShipmentStatus
> = {
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED',
};
