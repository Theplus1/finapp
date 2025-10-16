import { NextRequest, NextResponse } from "next/server";
import { shouldProxyRoute, getServerEndpoint } from "../proxy-config";
import { renderRequestUrl } from "../common";

const API_URL = process.env.API_URL as string;

/**
 * Dynamic proxy handler for API routes
 * This catches all routes that match the proxy configuration
 */
async function handleProxyRequest(
  request: NextRequest,
  params: { proxy: string[] }
) {
  const apiPath = `/${params.proxy.join('/')}`;
  const proxyConfig = shouldProxyRoute(apiPath);

  // If route is not configured for proxying, return 404
  if (!proxyConfig) {
    return NextResponse.json(
      {
        success: false,
        error: "Route not found or not configured for proxying",
      },
      { status: 404 }
    );
  }

  // Check if the HTTP method is allowed
  if (proxyConfig.methods && !proxyConfig.methods.includes(request.method as any)) {
    return NextResponse.json(
      {
        success: false,
        error: `Method ${request.method} not allowed for this route`,
      },
      { status: 405 }
    );
  }

  const { headers } = request;
  const serverEndpoint = getServerEndpoint(apiPath, proxyConfig);
  
  try {
    const requestUrl = renderRequestUrl(`${API_URL}${serverEndpoint}`, request);
    
    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    // Add body for non-GET requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const body = await request.text();
      if (body) {
        fetchOptions.body = body;
      }
    }

    const response = await fetch(requestUrl, fetchOptions);
    const data = await response.json();

    // Forward the status code from the server
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`Proxy error for ${apiPath}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  return handleProxyRequest(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  return handleProxyRequest(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  return handleProxyRequest(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  return handleProxyRequest(request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  return handleProxyRequest(request, params);
}
