/**
 * Standard audit fields returned by list endpoints.
 */
export interface AuditFields {
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}
