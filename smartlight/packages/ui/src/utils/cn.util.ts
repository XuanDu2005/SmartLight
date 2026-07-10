import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind-aware class-name combiner.
 * Returns a deduplicated, conflict-resolved string.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));