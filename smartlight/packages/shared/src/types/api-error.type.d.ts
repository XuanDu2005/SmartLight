/**
 * Standard API error envelope.
 * Matches the error contract documented in
 * `docs/04-api-design/06_ERROR_STANDARD.md`.
 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    traceId?: string;
    fieldErrors?: Array<{
        field: string;
        message: string;
        code?: string;
    }>;
}
