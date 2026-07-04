import { clsx, type ClassValue } from 'clsx';

/**
 * Convenience class-name combiner.
 * Tailwind-aware (returns a deduplicated, conflict-resolved string).
 */
export const cn = (...inputs: ClassValue[]): string => clsx(inputs);
