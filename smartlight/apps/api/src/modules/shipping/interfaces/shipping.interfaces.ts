/**
 * Repository contracts and domain types for shipping.
 */
import type {
  Prisma,
  Shipment,
  ShipmentEventType,
  ShipmentHistory,
  ShipmentItem,
  ShipmentStatus,
  ShippingProvider,
  ShippingWebhookLog,
} from '@prisma/client';

export type ShipmentWithAll = Prisma.ShipmentGetPayload<{
  include: {
    items: true;
    history: { orderBy: { createdAt: 'asc' } };
    order: {
      select: {
        id: true;
        orderNumber: true;
        userId: true;
        grandTotal: true;
        currency: true;
        status: true;
        shippingFullName: true;
        shippingPhone: true;
        shippingProvince: true;
        shippingDistrict: true;
        shippingWard: true;
        shippingDetail: true;
      };
    };
    user: { select: { id: true; email: true; firstName: true; lastName: true } };
  };
}>;

export interface ShipmentCreateInput {
  orderId: string;
  userId: string;
  provider: ShippingProvider;
  weightGrams: number;
  shippingFee: Prisma.Decimal | number;
  codAmount?: Prisma.Decimal | number;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  shipTo: {
    fullName: string | null;
    phone: string | null;
    province: string | null;
    district: string | null;
    ward: string | null;
    detail: string | null;
  };
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ShipmentItemCreateInput {
  shipmentId: string;
  orderItemId?: string | null;
  productVariantId: string;
  quantity: number;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  skuSnapshot: string;
  weightGramsSnapshot: number;
}

export interface ShipmentHistoryCreateInput {
  shipmentId: string;
  event: ShipmentEventType;
  oldStatus?: ShipmentStatus | null;
  newStatus?: ShipmentStatus | null;
  actorType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' | 'WEBHOOK';
  actorId?: string | null;
  actorName?: string | null;
  message?: string | null;
  location?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ListShipmentsFilter {
  userId?: string;
  orderId?: string;
  status?: ShipmentStatus;
  provider?: ShippingProvider;
  page: number;
  limit: number;
}

export interface ShipmentTrackingView {
  shipment: {
    id: string;
    shipmentNumber: string;
    trackingNumber: string | null;
    provider: string;
    status: string;
    estimatedDeliveryAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    weightGrams: number;
  };
  history: Array<{
    event: string;
    oldStatus: string | null;
    newStatus: string | null;
    message: string | null;
    location: string | null;
    occurredAt: string;
  }>;
}

export type {
  Shipment,
  ShipmentHistory,
  ShipmentItem,
  ShipmentStatus,
  ShippingProvider,
  ShippingWebhookLog,
};