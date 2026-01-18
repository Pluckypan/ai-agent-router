import { getAllProviders, getModelByModelIdAny } from '@/db/queries';
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
    let providerNameToUse = providerName;
    let requestedModelId = modelId;

    // If provider is not specified, try to auto-route by model_id
    if (!providerName) {
      console.log(`[Gateway ${requestId}] Provider not specified, attempting auto-routing by model_id:`, modelId);

      // Try to extract model_id from request body if available
      if (request.body?.model) {
        requestedModelId = request.body.model;
        console.log(`[Gateway ${requestId}] Using model_id from request body:`, requestedModelId);
      }

      // Find model in database by model_id
      const modelWithProvider = getModelByModelIdAny(requestedModelId);

      if (!modelWithProvider) {
        console.log(`[Gateway ${requestId}] Model not found in database:`, requestedModelId);
        return {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: {
            error: {
              message: `Model "${requestedModelId}" not found or not enabled. Please configure the model in the Gateway settings first.`,
              type: 'model_not_found',
            },
          },
        };
      }

      providerNameToUse = modelWithProvider.provider_name;
      console.log(`[Gateway ${requestId}] Auto-routed model "${requestedModelId}" to provider:`, providerNameToUse);
    }

    // Find the provider by name
    const providers = getAllProviders();
    const provider = providers.find(p => p.name.toLowerCase() === providerNameToUse!.toLowerCase());

    if (!provider) {
      console.log(`[Gateway ${requestId}] Provider not found:`, providerNameToUse);
      const availableProviders = providers.map(p => p.name).join(', ');
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: {
          error: {
            message: `Provider "${providerNameToUse}" not found. Available providers: ${availableProviders || 'none'}`,
            type: 'provider_not_found',
          },
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
      name: requestedModelId, // Use requested model_id as name for logging
      model_id: requestedModelId, // User-provided model ID
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
      modelId: requestedModelId,
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
