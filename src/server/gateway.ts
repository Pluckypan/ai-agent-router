import { getAllProviders } from '@/db/queries';
import { getProviderAdapter } from './providers';
import { logRequest } from './logger';
import type { GatewayRequest, GatewayResponse } from './providers/types';

export async function handleGatewayRequest(
  modelId: string,
  request: GatewayRequest,
  providerName?: string
): Promise<GatewayResponse> {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[Gateway ${requestId}] handleGatewayRequest called:`, {
    modelId,
    providerName: providerName || 'not specified',
    method: request.method,
    path: request.path,
  });

  try {
    // Provider name is required for gateway requests
    if (!providerName) {
      console.log(`[Gateway ${requestId}] Provider name not specified`);
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: { 
          error: { 
            message: 'Provider name is required. Please specify provider parameter.',
            type: 'missing_provider',
          } 
        },
      };
    }

    // Find the provider by name
    const providers = getAllProviders();
    const provider = providers.find(p => p.name.toLowerCase() === providerName.toLowerCase());
    
    if (!provider) {
      console.log(`[Gateway ${requestId}] Provider not found:`, providerName);
      const availableProviders = providers.map(p => p.name).join(', ');
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: { 
          error: { 
            message: `Provider "${providerName}" not found. Available providers: ${availableProviders || 'none'}`,
            type: 'provider_not_found',
          } 
        },
      };
    }

    console.log(`[Gateway ${requestId}] Provider found:`, {
      id: provider.id,
      name: provider.name,
      protocol: provider.protocol,
      base_url: provider.base_url,
      hasApiKey: !!provider.api_key,
    });

    // Create a model object with the user-provided model_id and the provider configuration
    // The model_id comes from the user request, not from the database
    const model = {
      id: 0, // Not used for gateway requests
      provider_id: provider.id,
      name: modelId, // Use model_id as name for logging
      model_id: modelId, // User-provided model ID
      enabled: true, // Always enabled for gateway requests
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      provider: {
        id: provider.id,
        name: provider.name,
        protocol: provider.protocol,
        base_url: provider.base_url,
        api_key: provider.api_key,
      },
    };

    // Get provider adapter
    const adapter = getProviderAdapter(provider.protocol);

    // Forward the request using provider's config and user's model_id
    console.log(`[Gateway ${requestId}] Forwarding request with:`, {
      provider: provider.name,
      protocol: provider.protocol,
      modelId: modelId,
    });
    
    const response = await adapter.forwardRequest(model as any, request);

    // Log the request (use NULL model_id for gateway requests)
    const responseTimeMs = Date.now() - startTime;
    try {
      await logRequest(
        {
          modelId: null as any, // NULL for gateway requests (no model in database)
          method: request.method,
          path: request.path,
          headers: request.headers,
          query: request.query,
          body: request.body,
        },
        {
          status: response.status,
          headers: response.headers,
          body: response.body,
          responseTimeMs,
        }
      );
      console.log(`[Gateway ${requestId}] Request logged successfully`);
    } catch (logError: any) {
      // Log error but don't fail the request
      console.error(`[Gateway ${requestId}] Failed to log request:`, logError.message);
    }

    return response;
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    console.error(`[Gateway ${requestId}] Error:`, {
      message: error.message,
      stack: error.stack,
    });
    
    const errorResponse: GatewayResponse = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: {
        error: {
          message: error.message || 'Internal server error',
          type: 'gateway_error',
        },
      },
    };

    // Try to log error request (use NULL model_id)
    try {
      await logRequest(
        {
          modelId: null as any, // NULL for gateway requests
          method: request.method,
          path: request.path,
          headers: request.headers,
          query: request.query,
          body: request.body,
        },
        {
          status: errorResponse.status,
          headers: errorResponse.headers,
          body: errorResponse.body,
          responseTimeMs,
        }
      );
    } catch (logError: any) {
      console.error(`[Gateway ${requestId}] Failed to log error request:`, logError.message);
    }

    return errorResponse;
  }
}
