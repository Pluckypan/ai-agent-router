import type { ProviderAdapter, GatewayRequest, GatewayResponse } from './types';
import type { Model, Provider } from '@/db/schema';
import { decryptApiKey } from '@/server/crypto';

export class GeminiAdapter implements ProviderAdapter {
  async forwardRequest(
    model: Model & { provider: Provider },
    request: GatewayRequest
  ): Promise<GatewayResponse> {
    const apiKey = decryptApiKey(model.provider.api_key);
    let baseUrl = model.provider.base_url || 'https://generativelanguage.googleapis.com/v1';
    
    // Normalize baseUrl
    baseUrl = baseUrl.trim().replace(/\/+$/, ''); // Remove trailing slashes
    
    // Build the target URL
    let targetPath = request.path;
    
    // If path is root or empty, default to generateContent endpoint
    if (!targetPath || targetPath === '/' || targetPath === '') {
      // Gemini uses model-specific endpoints: models/{model_id}:generateContent
      targetPath = `models/${model.model_id}:generateContent`;
    } else if (targetPath.startsWith('/v1/')) {
      targetPath = targetPath.substring(4);
    } else if (targetPath.startsWith('/')) {
      targetPath = targetPath.substring(1);
    }
    
    // Ensure baseUrl ends with /v1
    if (!baseUrl.endsWith('/v1')) {
      baseUrl = baseUrl + '/v1';
    }
    
    // Add API key to query params for Gemini
    const url = `${baseUrl}/${targetPath}?key=${apiKey}`;
    
    console.log('[Gemini Adapter] Forwarding request:', {
      baseUrl: model.provider.base_url,
      normalizedBaseUrl: baseUrl,
      originalPath: request.path,
      targetPath,
      url: url.replace(apiKey, '***'),
      method: request.method,
      hasApiKey: !!apiKey,
    });

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...request.headers,
    };
    delete headers['host'];
    delete headers['connection'];
    delete headers['authorization'];

    console.log('[Gemini Adapter] Request headers:', {
      'Content-Type': headers['Content-Type'],
    });

    // Make the request
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? JSON.stringify(request.body) : undefined,
    });
    
    console.log('[Gemini Adapter] Response status:', response.status, response.statusText);

    const responseBody = await response.text();
    console.log('[Gemini Adapter] Response body preview:', responseBody.substring(0, 200));
    
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      parsedBody = responseBody;
      console.log('[Gemini Adapter] Response body is not JSON, returning as string');
    }

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: parsedBody,
    };
  }

  async listModels(provider: Provider): Promise<Array<{ id: string; name: string }>> {
    const apiKey = decryptApiKey(provider.api_key);
    const baseUrl = provider.base_url || 'https://generativelanguage.googleapis.com/v1';

    try {
      const response = await fetch(`${baseUrl}/models?key=${apiKey}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.models || []).map((model: any) => ({
        id: model.name.replace('models/', ''),
        name: model.displayName || model.name,
      }));
    } catch (error) {
      console.error('Error fetching Gemini models:', error);
      throw error;
    }
  }
}
