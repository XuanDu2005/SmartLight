/**
 * Cursor/offset pagination response envelope.
 * Used across all list endpoints.
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total?: number;
    page?: number;
    pageSize?: number;
    nextCursor?: string | null;
    prevCursor?: string | null;
  };
}
