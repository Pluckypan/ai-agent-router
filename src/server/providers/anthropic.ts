import type { ProviderAdapter, GatewayRequest, GatewayResponse } from './types';
import type { Model, Provider } from '@/db/schema';
import { decryptApiKey } from '@/server/crypto';

export class AnthropicAdapter implements ProviderAdapter {
  async forwardRequest(
    model: Model & { provider: Provider },
    request: GatewayRequest
  ): Promise<GatewayResponse> {
    console.log('[Anthropic Adapter] Starting forwardRequest:', {
      modelId: model.model_id,
      modelName: model.name,
      providerName: model.provider.name,
      providerBaseUrl: model.provider.base_url,
      hasEncryptedApiKey: !!model.provider.api_key,
      encryptedApiKeyLength: model.provider.api_key?.length || 0,
    });
    
    let apiKey: string;
    try {
      apiKey = decryptApiKey(model.provider.api_key);
      console.log('[Anthropic Adapter] API key decrypted successfully, length:', apiKey.length);
    } catch (error: any) {
      console.error('[Anthropic Adapter] Failed to decrypt API key:', error.message);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: { message: 'Failed to decrypt API key', type: 'decryption_error' } },
      };
    }
    
    let baseUrl = model.provider.base_url || 'https://api.anthropic.com/v1';
    
    // Normalize baseUrl
    baseUrl = baseUrl.trim().replace(/\/+$/, ''); // Remove trailing slashes
    
    // Build the target URL
    let targetPath = request.path;
    
    // If path is root or empty, default to messages endpoint
    if (!targetPath || targetPath === '/' || targetPath === '') {
      targetPath = 'messages';
    } else if (targetPath.startsWith('/v1/')) {
      targetPath = targetPath.substring(4);
    } else if (targetPath.startsWith('/')) {
      targetPath = targetPath.substring(1);
    }
    
    // Ensure baseUrl ends with /v1
    if (!baseUrl.endsWith('/v1')) {
      baseUrl = baseUrl + '/v1';
    }
    
    const url = `${baseUrl}/${targetPath}`;
    
    console.log('[Anthropic Adapter] Forwarding request:', {
      baseUrl: model.provider.base_url,
      normalizedBaseUrl: baseUrl,
      originalPath: request.path,
      targetPath,
      url,
      method: request.method,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'none',
    });

    // Prepare headers - include both x-api-key and Authorization for compatibility
    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      'Authorization': `Bearer ${apiKey}`, // Standard Authorization header for custom gateways
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      ...request.headers,
    };
    delete headers['host'];
    delete headers['connection'];
    // Don't delete the Authorization header since we're setting it here

    console.log('[Anthropic Adapter] Request headers:', {
      'Content-Type': headers['Content-Type'],
      'x-api-key': headers['x-api-key'] ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'none',
      'Authorization': headers['Authorization'] ? `Bearer ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'none',
      'anthropic-version': headers['anthropic-version'],
    });

    // Make the request
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? JSON.stringify(request.body) : undefined,
    });
    
    console.log('[Anthropic Adapter] Response status:', response.status, response.statusText);

    const responseBody = await response.text();
    console.log('[Anthropic Adapter] Response body preview:', responseBody.substring(0, 200));
    
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      parsedBody = responseBody;
      console.log('[Anthropic Adapter] Response body is not JSON, returning as string');
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
