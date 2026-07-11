/**
 * Shipping response DTOs.
 */

export interface ShipmentAddressDto {
  fullName: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  detail: string | null;
}

export interface ShipmentItemDto {
  id: string;
  productVariantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  weightGrams: number;
}

export interface ShipmentHistoryEntryDto {
  id: string;
  event: string;
  oldStatus: string | null;
  newStatus: string | null;
  actorType: string;
  actorId: string | null;
  actorName: string | null;
  message: string | null;
  location: string | null;
  createdAt: string;
}

export interface ShipmentResponseDto {
  id: string;
  shipmentNumber: string;
  orderId: string;
  userId: string;
  provider: string;
  status: string;
  trackingNumber: string | null;
  shipTo: ShipmentAddressDto;
  weightGrams: number;
  shippingFee: number;
  codAmount: number;
  currency: string;
  labelUrl: string | null;
  estimatedDeliveryAt: string | null;
  shippedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  returnedAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  items: ShipmentItemDto[];
  history: ShipmentHistoryEntryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentSummaryDto {
  id: string;
  shipmentNumber: string;
  orderId: string;
  provider: string;
  status: string;
  trackingNumber: string | null;
  weightGrams: number;
  shippingFee: number;
  currency: string;
  estimatedDeliveryAt: string | null;
  createdAt: string;
}

export interface FeeEstimateResponseDto {
  provider: string;
  serviceCode: string;
  serviceName: string;
  fee: number;
  currency: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  cached: boolean;
}

export interface ProviderInfoDto {
  code: string;
  name: string;
  enabled: boolean;
}

export interface PublicTrackingResponseDto {
  shipmentNumber: string;
  trackingNumber: string | null;
  provider: string;
  status: string;
  estimatedDeliveryAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  history: Array<{
    event: string;
    oldStatus: string | null;
    newStatus: string | null;
    message: string | null;
    location: string | null;
    occurredAt: string;
  }>;
}

export interface ShipmentListResponseDto {
  items: ShipmentSummaryDto[];
  total: number;
  page: number;
  limit: number;
}
