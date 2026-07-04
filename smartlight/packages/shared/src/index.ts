// =============================================================================
//  SmartLight Shared Package
//  Cross-cutting types, enums, constants, and small pure utilities.
//  No business logic; no framework imports.
// =============================================================================

// Domain enums (mirror Prisma generated enums for use in shared layer).
export * from './enums/index';
// Shared value-object primitives (pure types only).
export * from './types/index';
// Application-wide constants (no magic numbers in app code).
export * from './constants/index';
// Small pure utilities.
export * from './utils/index';
