/**
 * Pagination constants shared across the application
 */

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MIN_PAGE: 1,
  MIN_LIMIT: 1,
  MAX_LIMIT: 1000,
} as const;

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export const SORT_DEFAULTS = {
  FIELD: 'createdAt',
  ORDER: SortOrder.DESC,
} as const;
