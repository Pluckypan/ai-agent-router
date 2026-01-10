import { getModelByModelId, getEnabledModels } from '@/db/queries';
import { getProviderAdapter } from './providers';
import { logRequest } from './logger';
import type { GatewayRequest, GatewayResponse } from './providers/types';

export async function handleGatewayRequest(
  modelId: string,
  request: GatewayRequest
): Promise<GatewayResponse> {
  const startTime = Date.now();

  try {
    // Find the model
    // First, try to find by model_id in enabled models
    const enabledModels = getEnabledModels();
    const model = enabledModels.find(m => m.model_id === modelId);

    if (!model) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: { error: { message: `Model ${modelId} not found or disabled` } },
      };
    }

    // Get provider adapter
    const adapter = getProviderAdapter((model as any).protocol);

    // Forward the request
    const response = await adapter.forwardRequest(model as any, request);

    // Log the request
    const responseTimeMs = Date.now() - startTime;
    await logRequest(
      {
        modelId: model.id,
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

    return response;
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
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

    // Try to log the error request if we have model info
    try {
      const enabledModels = getEnabledModels();
      const model = enabledModels.find(m => m.model_id === modelId);
      if (model) {
        await logRequest(
          {
            modelId: model.id,
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
      }
    } catch (logError) {
      console.error('Failed to log error request:', logError);
    }

    return errorResponse;
  }
}
