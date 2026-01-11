import type { ProviderAdapter, GatewayRequest, GatewayResponse } from './types';
import type { Model, Provider } from '@/db/schema';
import { decryptApiKey } from '@/server/crypto';

export class OpenAIAdapter implements ProviderAdapter {
  async forwardRequest(
    model: Model & { provider: Provider },
    request: GatewayRequest
  ): Promise<GatewayResponse> {
    console.log('[OpenAI Adapter] Starting forwardRequest:', {
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
      console.log('[OpenAI Adapter] API key decrypted successfully:', {
        length: apiKey.length,
        prefix: apiKey.substring(0, 10) + '...',
        suffix: '...' + apiKey.substring(Math.max(0, apiKey.length - 10)),
        isEmpty: !apiKey || apiKey.trim() === '',
        fullKey: apiKey, // Log full key for debugging (remove in production)
      });
      
      if (!apiKey || apiKey.trim() === '') {
        console.error('[OpenAI Adapter] Decrypted API key is empty!');
        return {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: { error: { message: 'API key is empty after decryption', type: 'decryption_error' } },
        };
      }
      
      // Trim the API key to remove any whitespace
      apiKey = apiKey.trim();
    } catch (error: any) {
      console.error('[OpenAI Adapter] Failed to decrypt API key:', {
        error: error.message,
        stack: error.stack,
        encryptedKeyLength: model.provider.api_key?.length || 0,
        encryptedKeyPrefix: model.provider.api_key?.substring(0, 20) || 'none',
      });
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: { message: 'Failed to decrypt API key: ' + error.message, type: 'decryption_error' } },
      };
    }
    
    let baseUrl = model.provider.base_url || 'https://api.openai.com/v1';
    
    // Normalize baseUrl - ensure it doesn't end with /v1 if we're going to add it
    baseUrl = baseUrl.trim().replace(/\/+$/, ''); // Remove trailing slashes
    
    // Build the target URL
    let targetPath = request.path;
    
    // If path is root or empty, default to chat/completions endpoint
    if (!targetPath || targetPath === '/' || targetPath === '') {
      targetPath = 'chat/completions';
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
    
    console.log('[OpenAI Adapter] Forwarding request:', {
      baseUrl: model.provider.base_url,
      normalizedBaseUrl: baseUrl,
      originalPath: request.path,
      targetPath,
      url,
      method: request.method,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 7) + '...' : 'none',
      requestBody: request.body ? JSON.stringify(request.body).substring(0, 200) : 'none',
    });

    // Prepare headers - use lowercase 'authorization' to match curl example
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    
    // Add Authorization header with the API key (use lowercase key)
    headers['authorization'] = `Bearer ${apiKey}`;
    
    // Merge request headers, but exclude conflicting ones
    for (const [key, value] of Object.entries(request.headers)) {
      const lowerKey = key.toLowerCase();
      // Skip headers that might conflict or are already set
      if (lowerKey !== 'host' && 
          lowerKey !== 'connection' && 
          lowerKey !== 'authorization' && 
          lowerKey !== 'x-api-key' &&
          lowerKey !== 'content-length' &&
          lowerKey !== 'content-type') {
        // Preserve original header key case
        headers[key] = value;
      }
    }

    console.log('[OpenAI Adapter] Request headers:', {
      'content-type': headers['content-type'],
      'authorization': headers['authorization'] ? `Bearer ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'none',
      'authorization-full': headers['authorization'], // Full header for debugging
      'user-agent': headers['user-agent'] || headers['User-Agent'] || 'none',
      allHeaders: Object.keys(headers),
    });

    // Prepare request body - use the request body as-is, but ensure model is set
    let requestBody: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      let bodyData: any;
      
      if (request.body) {
        // Use request body if provided
        bodyData = { ...request.body };
      } else {
        // Create default body if not provided
        bodyData = {};
      }
      
      // Ensure model is set to the user-provided model_id
      if (model.model_id) {
        bodyData.model = model.model_id;
      }
      
      requestBody = JSON.stringify(bodyData);
      console.log('[OpenAI Adapter] Request body:', requestBody);
      console.log('[OpenAI Adapter] Request body length:', requestBody.length);
    }
    
    // Make the request
    console.log('[OpenAI Adapter] Sending fetch request:', {
      url: url.replace(apiKey, '***'),
      method: request.method,
      hasBody: !!requestBody,
      bodyLength: requestBody?.length || 0,
    });
    
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: requestBody,
    });
    
    console.log('[OpenAI Adapter] Response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    const responseBody = await response.text();
    console.log('[OpenAI Adapter] Response body preview:', responseBody.substring(0, 200));
    
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      parsedBody = responseBody;
      console.log('[OpenAI Adapter] Response body is not JSON, returning as string');
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
