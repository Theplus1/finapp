/**
 * Generic repository query interface
 * Used to pass structured queries from services to repositories
 */
export interface RepositoryQuery {
  filter: any; // MongoDB filter object
  skip: number;
  limit: number;
  sort?: any; // MongoDB sort object
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Paginated response
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
