/**
 * Repository contracts for the orders bounded context.
 */
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  Prisma,
} from '@prisma/client';

/* ---------- Read shapes ---------- */

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: true;
    statusHistory: {
      orderBy: { createdAt: 'asc' };
    };
  };
}>;

export type OrderWithFull = Prisma.OrderGetPayload<{
  include: {
    items: true;
    statusHistory: {
      orderBy: { createdAt: 'asc' };
    };
    user: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

/* ---------- Mutation inputs ---------- */

export interface OrderCreateInput {
  orderNumber: string;
  userId: string;
  checkoutSessionId: string;
  cartId: string;
  reservationId: string;
  currency: string;
  locale: string;
  subtotal: Prisma.Decimal | number;
  discountAmount: Prisma.Decimal | number;
  shippingFee: Prisma.Decimal | number;
  taxAmount: Prisma.Decimal | number;
  grandTotal: Prisma.Decimal | number;
  couponCode: string | null;
  shippingAddress: {
    fullName: string | null;
    phone: string | null;
    province: string | null;
    district: string | null;
    ward: string | null;
    detail: string | null;
  };
  billingAddress: {
    fullName: string | null;
    phone: string | null;
    province: string | null;
    district: string | null;
    ward: string | null;
    detail: string | null;
  };
  customerNotes: string | null;
}

export interface OrderItemCreateInput {
  orderId: string;
  productVariantId: string;
  quantity: number;
  unitPriceSnapshot: Prisma.Decimal | number;
  lineSubtotalSnapshot: Prisma.Decimal | number;
  taxAmountSnapshot: Prisma.Decimal | number;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  skuSnapshot: string;
  productSlugSnapshot: string;
  imageSnapshotUrl: string | null;
  weightGramsSnapshot: number | null;
}

export interface StatusHistoryCreateInput {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedByType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' | 'WEBHOOK';
  changedById: string | null;
  changedByName: string | null;
  reason: string | null;
  metadata?: Record<string, unknown>;
}

/* ---------- Query filters ---------- */

export interface ListOrdersFilter {
  userId?: string;
  status?: OrderStatus;
  page: number;
  limit: number;
}

/* ---------- Domain re-exports ---------- */

export type { Order, OrderItem, OrderStatusHistory };
