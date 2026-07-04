/**
 * Standard audit fields returned by list endpoints.
 */
export interface AuditFields {
  createdAt: string; // ISO-8601 UTC
  updatedAt: string; // ISO-8601 UTC
  deletedAt?: string | null;
}
