import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/database';
import { handleGatewayRequest } from '@/server/gateway';

// Ensure Node.js runtime (required for SQLite)
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'POST');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'GET');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    getDatabase();
    // Extract model ID from path or query
    // Common patterns: /v1/models/{model_id}/... or ?model=...
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams;
    
    // Try to get model from query or path
    let modelId = searchParams.get('model') || searchParams.get('model_id');
    
    // If not in query, try to extract from path (e.g., /v1/models/gpt-4/completions)
    if (!modelId) {
      const pathParts = path.split('/');
      const modelsIndex = pathParts.indexOf('models');
      if (modelsIndex >= 0 && pathParts[modelsIndex + 1]) {
        modelId = pathParts[modelsIndex + 1];
      }
    }
    
    // If still no model, try to get from body
    if (!modelId) {
      try {
        const body = await request.json();
        modelId = body.model || body.model_id;
      } catch {
        // Body might not be JSON or might be empty
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
      path: '/' + path,
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
