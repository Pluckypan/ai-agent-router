import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/database';
import { getProviderById, getModelById } from '@/db/queries';
import { getProviderAdapter } from '@/server/providers';
import type { GatewayRequest } from '@/server/providers/types';

// Ensure Node.js runtime (required for SQLite)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    getDatabase();
    const body = await request.json();
    const { provider_id, model_id } = body;

    if (!provider_id || !model_id) {
      return NextResponse.json(
        { error: 'Provider ID and Model ID are required' },
        { status: 400 }
      );
    }

    // Get provider and model
    const provider = getProviderById(provider_id);
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const model = getModelById(model_id);
    if (!model || model.provider_id !== provider_id) {
      return NextResponse.json(
        { error: 'Model not found or does not belong to this provider' },
        { status: 404 }
      );
    }

    // Get provider adapter
    const adapter = getProviderAdapter(provider.protocol);

    // Create a test request based on protocol
    const testRequest = createTestRequest(provider.protocol, model.model_id);

    // Send test request with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('连接超时，请检查网络或稍后重试')), 10000);
    });

    const testPromise = adapter.forwardRequest(
      { ...model, provider } as any,
      testRequest
    );

    const response = await Promise.race([testPromise, timeoutPromise]) as any;

    // Check response status
    if (response.status >= 200 && response.status < 300) {
      return NextResponse.json({
        success: true,
        message: '连接成功，模型可用',
      });
    } else {
      // Parse error message
      let errorMessage = '连接失败';
      if (response.body?.error?.message) {
        errorMessage = response.body.error.message;
      } else if (typeof response.body === 'string') {
        errorMessage = response.body;
      }

      // Map common error codes to friendly messages
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'API Key 无效，请检查配置';
      } else if (response.status === 404) {
        errorMessage = '模型不存在或不可用';
      } else if (response.status >= 500) {
        errorMessage = '服务器错误，请稍后重试';
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          status: response.status,
        },
        { status: 200 } // Return 200 so frontend can handle the error
      );
    }
  } catch (error: any) {
    console.error('Test connection error:', error);

    // Handle specific error types
    let errorMessage = '连接失败';
    if (error.message.includes('超时')) {
      errorMessage = error.message;
    } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      errorMessage = '无法连接到服务器，请检查 Base URL 和网络连接';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
      errorMessage = 'DNS 解析失败，请检查 Base URL';
    } else {
      errorMessage = error.message || '连接失败，请检查配置';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 200 } // Return 200 so frontend can handle the error
    );
  }
}

function createTestRequest(protocol: string, modelId: string): GatewayRequest {
  switch (protocol) {
    case 'openai':
      return {
        method: 'POST',
        path: '/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
        },
        query: {},
        body: {
          model: modelId,
          messages: [
            {
              role: 'user',
              content: 'test',
            },
          ],
          max_tokens: 5,
        },
      };

    case 'anthropic':
      return {
        method: 'POST',
        path: '/v1/messages',
        headers: {
          'Content-Type': 'application/json',
        },
        query: {},
        body: {
          model: modelId,
          max_tokens: 5,
          messages: [
            {
              role: 'user',
              content: 'test',
            },
          ],
        },
      };

    case 'gemini':
      return {
        method: 'POST',
        path: `/v1/models/${modelId}:generateContent`,
        headers: {
          'Content-Type': 'application/json',
        },
        query: {},
        body: {
          contents: [
            {
              parts: [
                {
                  text: 'test',
                },
              ],
            },
          ],
        },
      };

    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
}
