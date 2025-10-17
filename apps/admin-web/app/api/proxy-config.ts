/**
 * Configuration for API routes that should be proxied to the server
 * 
 * Routes listed here will be automatically forwarded to the backend server
 * Routes not listed will need to be handled manually in their own route files
 */

import { HTTP_METHOD } from "next/dist/server/web/http";

export interface ProxyRouteConfig {
  /** The API path (e.g., '/card', '/transaction') */
  path: string;
  /** Whether to proxy this route to the server */
  enabled: boolean;
  /** Optional: Custom server endpoint if different from the path */
  serverEndpoint?: string;
  /** Optional: Allowed HTTP methods. If not specified, all methods are allowed */
  methods?: HTTP_METHOD[];
}

export const PROXY_ROUTES: ProxyRouteConfig[] = [
  {
    path: '/card-groups',
    enabled: true,
    serverEndpoint: '/card-groups',
  },
  {
    path: '/card',
    enabled: true,
    serverEndpoint: '/cards', // Maps /api/card to /cards on server
  },
  {
    path: '/transaction',
    enabled: true,
    serverEndpoint: '/transactions',
  },
  {
    path: '/users',
    enabled: true,
  },
  {
    path: '/virtual-account',
    enabled: true,
    serverEndpoint: '/virtual-accounts',
  },
  {
    path: '/auth',
    enabled: true,
    serverEndpoint: '/auth',
  },
];

/**
 * Check if a route should be proxied to the server
 */
export function shouldProxyRoute(path: string): ProxyRouteConfig | null {
  const route = PROXY_ROUTES.find(r => path.startsWith(r.path) && r.enabled);
  return route || null;
}

/**
 * Get the server endpoint for a given API path
 */
export function getServerEndpoint(apiPath: string, config: ProxyRouteConfig): string {
  if (config.serverEndpoint) {
    // Replace the config path with the server endpoint
    return apiPath.replace(config.path, config.serverEndpoint);
  }
  return apiPath;
}
