import type { ProviderAdapter, GatewayRequest, GatewayResponse } from './types';
import type { Model, Provider } from '@/db/schema';
import { decryptApiKey } from '@/server/crypto';

export class OpenAIAdapter implements ProviderAdapter {
  async forwardRequest(
    model: Model & { provider: Provider },
    request: GatewayRequest
  ): Promise<GatewayResponse> {
    const apiKey = decryptApiKey(model.provider.api_key);
    const baseUrl = model.provider.base_url || 'https://api.openai.com/v1';

    // Build the target URL
    let targetPath = request.path;
    if (targetPath.startsWith('/v1/')) {
      targetPath = targetPath.substring(4);
    }
    const url = `${baseUrl}/${targetPath}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...request.headers,
    };
    delete headers['host'];
    delete headers['connection'];

    // Make the request
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? JSON.stringify(request.body) : undefined,
    });

    const responseBody = await response.text();
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      parsedBody = responseBody;
    }

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: parsedBody,
    };
  }

  async listModels(provider: Provider): Promise<Array<{ id: string; name: string }>> {
    const apiKey = decryptApiKey(provider.api_key);
    let baseUrl = provider.base_url || 'https://api.openai.com/v1';
    
    // Ensure baseUrl doesn't end with / and has /v1
    baseUrl = baseUrl.trim().replace(/\/+$/, ''); // Remove trailing slashes
    if (!baseUrl.endsWith('/v1')) {
      baseUrl = baseUrl.endsWith('/') ? baseUrl + 'v1' : baseUrl + '/v1';
    }
    
    const url = `${baseUrl}/models`;
    
    console.log('[OpenAI] Fetching models:', {
      baseUrl: provider.base_url,
      normalizedBaseUrl: baseUrl,
      url,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      apiKeyLength: apiKey.length,
    });

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[OpenAI] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OpenAI] Error response body:', errorText);
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      console.log('[OpenAI] Fetched models count:', data.data?.length || 0);
      return (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.id, // OpenAI uses model ID as name
      }));
    } catch (error) {
      console.error('[OpenAI] Error fetching models:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        url,
        baseUrl: provider.base_url,
      });
      throw error;
    }
  }
}
