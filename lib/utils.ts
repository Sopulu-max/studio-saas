import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely unwraps a Supabase joined relation that might mistakenly be returned as an array 
 * instead of a single object (e.g., PostgREST many-to-one ambiguity).
 */
export function unwrapRow<T>(relation: T | T[] | null | undefined): T {
  if (relation === null || relation === undefined) return undefined as any;
  return (Array.isArray(relation) ? relation[0] : relation) as T;
}
