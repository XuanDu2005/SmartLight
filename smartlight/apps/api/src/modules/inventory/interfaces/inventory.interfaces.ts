/**
 * Repository contracts and domain types for the inventory bounded context.
 */
import type {
  Inventory,
  Prisma,
  StockMovement,
  InventoryAdjustment,
} from '@prisma/client';

/* ---------- Read shapes ---------- */

export type InventoryWithVariant = Prisma.InventoryGetPayload<{
  include: {
    variant: {
      include: {
        product: {
          select: {
            id: true;
            name: true;
            slug: true;
            status: true;
            deletedAt: true;
          };
        };
      };
    };
  };
}>;

export type InventoryWithMovements = Prisma.InventoryGetPayload<{
  include: {
    stockMovements: {
      orderBy: { createdAt: 'desc' };
      take: 50;
    };
    variant: {
      include: {
        product: {
          select: {
            id: true;
            name: true;
            slug: true;
          };
        };
      };
    };
  };
}>;

/* ---------- Service-level return types ---------- */

export interface StockAvailability {
  variantId: string;
  sku: string;
  productName: string;
  productSlug: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  lowStock: boolean;
  warehouseCode: string;
}

export interface ReservationResult {
  variantId: string;
  quantity: number;
  success: boolean;
  reason?: string;
}

/* ---------- Domain re-exports ---------- */

export type { Inventory, StockMovement, InventoryAdjustment };