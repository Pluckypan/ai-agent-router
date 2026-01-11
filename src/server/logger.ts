import { createRequestLog } from '@/db/queries';
import { maskApiKey, maskToken } from './crypto';

export interface LogRequest {
  modelId: number | null; // Allow null for gateway requests
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: any;
}

export interface LogResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  responseTimeMs: number;
}

export async function logRequest(
  request: LogRequest,
  response: LogResponse
): Promise<void> {
  try {
    // Mask sensitive information
    const maskedHeaders = maskSensitiveHeaders(request.headers);
    const maskedBody = maskSensitiveData(request.body);

    await createRequestLog({
      model_id: request.modelId,
      request_method: request.method,
      request_path: request.path,
      request_headers: JSON.stringify(maskedHeaders),
      request_query: JSON.stringify(request.query),
      request_body: JSON.stringify(maskedBody),
      response_status: response.status,
      response_body: JSON.stringify(response.body),
      response_time_ms: response.responseTimeMs,
    });
  } catch (error) {
    console.error('Failed to log request:', error);
    // Don't throw - logging failure shouldn't break the request
  }
}

function maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const masked = { ...headers };
  
  // Mask API keys
  if (masked['authorization']) {
    const auth = masked['authorization'];
    if (auth.startsWith('Bearer ')) {
      masked['authorization'] = `Bearer ${maskToken(auth.substring(7))}`;
    } else {
      masked['authorization'] = maskToken(auth);
    }
  }
  
  if (masked['x-api-key']) {
    masked['x-api-key'] = maskApiKey(masked['x-api-key']);
  }
  
  if (masked['api-key']) {
    masked['api-key'] = maskApiKey(masked['api-key']);
  }
  
  return masked;
}

function maskSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }
  
  const masked: any = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('api') && lowerKey.includes('key')) {
      masked[key] = maskApiKey(String(value));
    } else if (lowerKey.includes('token')) {
      masked[key] = maskToken(String(value));
    } else if (lowerKey === 'authorization') {
      masked[key] = maskToken(String(value));
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}
