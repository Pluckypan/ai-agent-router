import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import Anthropic from '@anthropic-ai/sdk';

// Custom fetch type compatible with SDK's Fetch parameter
type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// 强制动态渲染，避免构建时预执行
export const dynamic = 'force-dynamic';

// Claude settings.json 文件路径
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');

/**
 * 测试 Claude Code 配置是否正常工作
 * 使用 Anthropic SDK 直接调用 API 测试
 */
export async function GET(request: NextRequest) {
  try {
    // 检查配置文件是否存在
    if (!existsSync(SETTINGS_FILE)) {
      return NextResponse.json({
        success: false,
        error: 'Configuration file not found',
        suggestion: 'Please apply configuration first',
      });
    }

    // 读取配置
    const configContent = readFileSync(SETTINGS_FILE, 'utf-8');
    let config: any;
    try {
      config = JSON.parse(configContent);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid configuration format',
      });
    }

    const env = config.env || {};
    const baseUrl = env.ANTHROPIC_BASE_URL;
    const apiKey = env.ANTHROPIC_AUTH_TOKEN;
    const routerProvider = config.router_provider;
    const model = env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'claude-3-5-sonnet-latest';

    // 检查关键配置字段
    const checks: { [key: string]: boolean } = {
      hasBaseUrl: !!baseUrl,
      hasApiKey: !!apiKey,
      hasHaikuModel: !!env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
      hasSonnetModel: !!env.ANTHROPIC_DEFAULT_SONNET_MODEL,
      hasOpusModel: !!env.ANTHROPIC_DEFAULT_OPUS_MODEL,
      hasDefaultModel: !!env.ANTHROPIC_MODEL,
      hasReasoningModel: !!env.ANTHROPIC_REASONING_MODEL,
    };

    const allChecksPassed = Object.values(checks).every(v => v);

    // 使用 SDK 测试连接，配置自定义 fetch 使用 x-api-key header
    const claudeTest = await new Promise<{
      success: boolean;
      message: string;
      error: string;
      latency: number;
      usage?: { input_tokens: number; output_tokens: number };
      model?: string;
      responseId?: string;
    }>((resolve) => {
      if (!allChecksPassed) {
        resolve({
          success: false,
          message: '',
          error: 'Prerequisite checks failed',
          latency: 0,
        });
        return;
      }

      const onAbort = () => {};
      request.signal.addEventListener('abort', onAbort);

      const timeout = setTimeout(() => {
        request.signal.removeEventListener('abort', onAbort);
        resolve({
          success: false,
          message: '',
          error: 'Request timed out after 60 seconds',
          latency: 0,
        });
      }, 60000);

      const testWithSDK = async () => {
        const startTime = Date.now();

        // Normalize baseUrl
        // 对于 model-router.meitu.com 不添加 /v1 后缀，其他 API 需要添加
        let normalizedBaseUrl = (baseUrl || 'https://api.anthropic.com').trim().replace(/\/+$/, '');
        const isCustomGateway = normalizedBaseUrl.includes('model-router.meitu.com');
        if (!isCustomGateway && !normalizedBaseUrl.endsWith('/v1')) {
          normalizedBaseUrl = normalizedBaseUrl + '/v1';
        }

        try {
          const anthropic = new Anthropic({
            baseURL: normalizedBaseUrl,
            apiKey: apiKey,
          });

          const response = await anthropic.messages.create({
            model: model,
            max_tokens: 20,
            messages: [{ role: 'user', content: 'ok' }],
          });

          clearTimeout(timeout);
          request.signal.removeEventListener('abort', onAbort);

          const latency = Date.now() - startTime;

          resolve({
            success: true,
            message: 'API call successful',
            error: '',
            latency,
            usage: {
              input_tokens: response.usage.input_tokens,
              output_tokens: response.usage.output_tokens,
            },
            model: response.model,
            responseId: response.id,
          });
        } catch (error: any) {
          clearTimeout(timeout);
          request.signal.removeEventListener('abort', onAbort);

          resolve({
            success: false,
            message: '',
            error: error.message || error.cause || 'SDK call failed',
            latency: 0,
          });
        }
      };

      testWithSDK();
    });

    return NextResponse.json({
      success: claudeTest.success,
      checks,
      claudeTest,
      configSummary: {
        baseUrl,
        apiKey: apiKey ? apiKey.slice(0, 4) + '****' + apiKey.slice(-4) : 'missing',
        haikuModel: env.ANTHROPIC_DEFAULT_HAIKU_MODEL || 'not set',
        sonnetModel: env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'not set',
        opusModel: env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'not set',
        defaultModel: env.ANTHROPIC_MODEL || 'not set',
        reasoningModel: env.ANTHROPIC_REASONING_MODEL || 'not set',
        routerProvider: routerProvider || 'unknown',
      },
    });
  } catch (error: any) {
    console.error('IDE Test API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
