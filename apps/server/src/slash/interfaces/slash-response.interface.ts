export interface SlashApiResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ListResponse<T> {
  items: T[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}
