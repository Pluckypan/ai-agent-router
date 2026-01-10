import type { ProviderAdapter, GatewayRequest, GatewayResponse } from './types';
import type { Model, Provider } from '@/db/schema';
import { decryptApiKey } from '@/server/crypto';

export class AnthropicAdapter implements ProviderAdapter {
  async forwardRequest(
    model: Model & { provider: Provider },
    request: GatewayRequest
  ): Promise<GatewayResponse> {
    const apiKey = decryptApiKey(model.provider.api_key);
    const baseUrl = model.provider.base_url || 'https://api.anthropic.com/v1';

    // Build the target URL
    let targetPath = request.path;
    if (targetPath.startsWith('/v1/')) {
      targetPath = targetPath.substring(4);
    }
    const url = `${baseUrl}/${targetPath}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
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
    // Anthropic doesn't have a public models endpoint
    // Return common models
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ];
  }
}
