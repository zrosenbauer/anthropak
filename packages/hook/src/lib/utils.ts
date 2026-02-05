/**
 * @fileoverview Utility functions.
 */

/**
 * Safely parses JSON, returning a default value on failure.
 *
 * @param content - JSON string to parse
 * @param defaultValue - Value to return if parsing fails
 * @returns Parsed value or default
 */
export function safeParse<T>(content: string, defaultValue: T): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}
