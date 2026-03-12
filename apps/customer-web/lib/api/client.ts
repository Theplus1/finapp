/**
 * HTTP Client for API requests
 *
 * Features:
 * - Automatic token handling
 * - Request/response interceptors
 * - Error handling
 * - Type-safe responses
 */

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

class HttpClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;

  constructor(baseURL: string = "/api") {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(endpoint: string, params?: Record<string, unknown>): string {
    const url = new URL(this.baseURL + endpoint, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Get authentication token from storage
   */
  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  }

  /**
   * Build request headers
   */
  private buildHeaders(customHeaders?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      ...(this.defaultHeaders as Record<string, string>),
    };

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Merge custom headers
    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  /**
   * Transform API errors to user-friendly messages
   */
  private getErrorMessage(status: number, data: unknown): string {
    if (data && (data as { message: string }).message) {
      return (data as { message: string }).message;
    }
    // Map HTTP status codes to user-friendly messages
    const statusMessages: Record<number, string> = {
      400: "Invalid request. Please check your input",
      401: "Invalid email or password",
      403: "You don't have permission to perform this action",
      404: "The requested resource was not found",
      409: "This resource already exists",
      422: "Please check your input and try again",
      429: "Too many attempts. Please try again later",
      500: "Something went wrong. Please try again",
      502: "Service temporarily unavailable",
      503: "Service temporarily unavailable",
    };

    // Use status-based message if available
    if (statusMessages[status]) {
      return statusMessages[status];
    }

    // Use server message only if it looks user-friendly (no technical jargon)
    const serverMessage =
      (data as { message: string }).message ||
      (data as { error: string }).error;
    if (
      serverMessage &&
      !serverMessage.includes("Error:") &&
      !serverMessage.includes("Exception")
    ) {
      return serverMessage;
    }

    return "An unexpected error occurred. Please try again";
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    let data: unknown;
    if (isJson) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error: ApiError = {
        message: this.getErrorMessage(response.status, data),
        code: (data as { code: string }).code,
        status: response.status,
      };
      throw error;
    }
    return data as ApiResponse<T>;
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    const { params, headers, body, ...restConfig } = config || {};

    const url = this.buildURL(endpoint, params);
    const requestHeaders = this.buildHeaders(headers);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        ...restConfig,
      });
      const currentPath = window.location.pathname;
      const pathLogin = "/login";
      if (response.status === 401 && currentPath !== pathLogin) {
        window.location.href = pathLogin;
      }
      const result: ApiResponse<T> = await this.handleResponse<T>(response);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw {
          message: error.message,
          code: "NETWORK_ERROR",
        } as ApiError;
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("GET", endpoint, config);
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("POST", endpoint, {
      ...config,
      body: data as BodyInit,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", endpoint, {
      ...config,
      body: data as BodyInit,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", endpoint, {
      ...config,
      body: data as BodyInit,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", endpoint, config);
  }
}

// Export singleton instance
export const apiClient = new HttpClient();

// Export types
export type { ApiResponse, ApiError, RequestConfig };
