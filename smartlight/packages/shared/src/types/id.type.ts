/**
 * Entity IDs are opaque strings (cuid() in V1, UUID v7 in V2).
 * Use `EntityId` as a marker type for clarity; it remains `string` at runtime.
 */
export type EntityId = string;
