import { apiClient } from './api-client';
import type {
  BulkAdjustmentDto,
  ImportStockDto,
  InventoryListParams,
  InventoryStock,
  ListMovementsParams,
  Paginated,
  StockMovement,
  UpdateThresholdDto,
} from './types';

export const inventoryApi = {
  list: async (
    params: InventoryListParams = {},
  ): Promise<Paginated<InventoryStock>> => {
    const { data } = await apiClient.get<Paginated<InventoryStock>>(
      '/admin/inventory',
      { params },
    );
    return data;
  },

  get: async (variantId: string): Promise<InventoryStock> => {
    const { data } = await apiClient.get<InventoryStock>(
      `/admin/inventory/${variantId}`,
    );
    return data;
  },

  getAvailability: async (
    variantId: string,
  ): Promise<{
    variantId: string;
    available: number;
    onHand: number;
    reserved: number;
  }> => {
    const { data } = await apiClient.get<{
      variantId: string;
      available: number;
      onHand: number;
      reserved: number;
    }>(`/catalog/variants/${variantId}/availability`);
    return data;
  },

  listLowStock: async (): Promise<{ items: InventoryStock[]; total: number }> => {
    const { data } = await apiClient.get<{ items: InventoryStock[]; total: number }>(
      '/admin/inventory/low-stock',
    );
    return data;
  },

  movements: async (
    variantId: string,
    params: ListMovementsParams = {},
  ): Promise<Paginated<StockMovement>> => {
    const { data } = await apiClient.get<Paginated<StockMovement>>(
      `/admin/inventory/${variantId}/movements`,
      { params },
    );
    return data;
  },

  import: async (
    dto: ImportStockDto,
  ): Promise<{ variantId: string; onHand: number; available: number }> => {
    const { data } = await apiClient.post<{
      variantId: string;
      onHand: number;
      available: number;
    }>('/admin/inventory/import', dto);
    return data;
  },

  adjust: async (
    variantId: string,
    quantity: number,
    reason: string,
  ): Promise<{ variantId: string; onHand: number; available: number }> => {
    const { data } = await apiClient.post<{
      variantId: string;
      onHand: number;
      available: number;
    }>('/admin/inventory/adjust', {
      variantId,
      adjustment: { quantity, reason },
    });
    return data;
  },

  bulkAdjust: async (
    dto: BulkAdjustmentDto,
  ): Promise<{
    processed: number;
    results: Array<{ variantId: string; success: boolean; error?: string }>;
  }> => {
    const { data } = await apiClient.post<{
      processed: number;
      results: Array<{ variantId: string; success: boolean; error?: string }>;
    }>('/admin/inventory/bulk-adjust', dto);
    return data;
  },

  updateThreshold: async (
    variantId: string,
    dto: UpdateThresholdDto,
  ): Promise<InventoryStock> => {
    const { data } = await apiClient.patch<InventoryStock>(
      `/admin/inventory/${variantId}/threshold`,
      dto,
    );
    return data;
  },
};