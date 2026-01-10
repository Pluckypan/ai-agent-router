import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/database';
import { handleGatewayRequest } from '@/server/gateway';

// Ensure Node.js runtime (required for SQLite)
export const runtime = 'nodejs';

// Handle requests to /api/gateway (root gateway endpoint)
export async function POST(request: NextRequest) {
  return handleGatewayRequestDirect(request, 'POST');
}

export async function GET(request: NextRequest) {
  return handleGatewayRequestDirect(request, 'GET');
}

async function handleGatewayRequestDirect(
  request: NextRequest,
  method: string
) {
  try {
    getDatabase();
    const searchParams = request.nextUrl.searchParams;
    let modelId = searchParams.get('model') || searchParams.get('model_id');

    // Try to get from body
    if (!modelId) {
      try {
        const body = await request.json();
        modelId = body.model || body.model_id;
      } catch {
        // Body might not be JSON
      }
    }

    if (!modelId) {
      return NextResponse.json(
        { error: { message: 'Model ID not specified' } },
        { status: 400 }
      );
    }

    // Get request body
    let body: any = null;
    try {
      if (method !== 'GET' && method !== 'HEAD') {
        const text = await request.text();
        if (text) {
          body = JSON.parse(text);
        }
      }
    } catch {
      // Body might not be JSON
    }

    // Build gateway request
    const gatewayRequest = {
      method,
      path: '/',
      headers: Object.fromEntries(request.headers.entries()),
      query: Object.fromEntries(searchParams.entries()),
      body,
    };

    // Handle the request
    const response = await handleGatewayRequest(modelId, gatewayRequest);

    // Return response
    return NextResponse.json(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}
