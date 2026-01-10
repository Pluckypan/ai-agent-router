import type { ProviderAdapter, GatewayRequest, GatewayResponse } from './types';
import type { Model, Provider } from '@/db/schema';
import { decryptApiKey } from '@/server/crypto';

export class GeminiAdapter implements ProviderAdapter {
  async forwardRequest(
    model: Model & { provider: Provider },
    request: GatewayRequest
  ): Promise<GatewayResponse> {
    const apiKey = decryptApiKey(model.provider.api_key);
    const baseUrl = model.provider.base_url || 'https://generativelanguage.googleapis.com/v1';

    // Build the target URL
    let targetPath = request.path;
    if (targetPath.startsWith('/v1/')) {
      targetPath = targetPath.substring(4);
    }
    // Add API key to query params for Gemini
    const url = `${baseUrl}/${targetPath}?key=${apiKey}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...request.headers,
    };
    delete headers['host'];
    delete headers['connection'];
    delete headers['authorization'];

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
