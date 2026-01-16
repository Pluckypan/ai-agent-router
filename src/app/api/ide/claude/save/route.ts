import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getDatabase } from '@/db/database';
import { getConfig } from '@/db/queries';

// Claude settings.json 文件路径
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');

// AAR 临时配置目录和文件
const AAR_DIR = join(homedir(), '.aar');
const TEMP_SETTINGS_FILE = join(AAR_DIR, 'settings.tmp.json');

type SaveRequest = {
  haiku?: string;
  sonnet?: string;
  opus?: string;
  default?: string;
  reasoning?: string;
};

/**
 * 保存 IDE 配置
 * - 如果当前已应用配置（ ~/.claude/settings.json 存在且匹配当前网关），直接更新 settings.json
 * - 如果未应用网关配置，保存到 ~/.aar/settings.tmp.json（临时存储）
 */
export async function POST(request: NextRequest) {
  try {
    const body: SaveRequest = await request.json();
    const { haiku, sonnet, opus, default: defaultModel, reasoning: reasoningModel } = body;

    // 验证请求参数 - 至少需要一个设置
    if (haiku === undefined && sonnet === undefined && opus === undefined &&
        defaultModel === undefined && reasoningModel === undefined) {
      return NextResponse.json(
        { error: 'No model settings provided' },
        { status: 400 }
      );
    }

    // 获取当前网关地址和API Key（从数据库读取）
    const gatewayAddress = getGatewayAddress();
    const gatewayApiKey = getGatewayApiKey();

    // 检查当前配置状态
    const settingsFileExists = existsSync(SETTINGS_FILE);
    let isCurrentGatewayApplied = false;

    if (settingsFileExists) {
      const currentConfig = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
      const appliedBaseUrl = currentConfig.env?.ANTHROPIC_BASE_URL;
      const appliedApiKey = currentConfig.env?.ANTHROPIC_AUTH_TOKEN;
      isCurrentGatewayApplied = appliedBaseUrl === gatewayAddress && appliedApiKey === gatewayApiKey;
    }

    // 决定保存位置和方式
    let savePath: string;
    let saveType: string;
    let mergedConfig: any;

    if (settingsFileExists && isCurrentGatewayApplied) {
      // 已应用当前网关配置，更新 settings.json
      savePath = SETTINGS_FILE;
      saveType = 'applied';
      mergedConfig = generateClaudeConfig(gatewayAddress, gatewayApiKey, {
        haiku: haiku,
        sonnet: sonnet,
        opus: opus,
        default: defaultModel,
        reasoning: reasoningModel
      });
    } else {
      // 未应用网络关配置，保存到临时文件 ~/.aar/settings.tmp.json
      savePath = TEMP_SETTINGS_FILE;
      saveType = 'temp';

      // 临时配置只保存模型映射，不包含网关信息
      mergedConfig = {
        modelMapping: {
          haiku: haiku,
          sonnet: sonnet,
          opus: opus,
          default: defaultModel,
          reasoning: reasoningModel,
        },
        // 标记这是临时配置，需要应用时才获取网关信息
        isTemp: true,
        savedAt: new Date().toISOString(),
      };
    }

    // 确保目录存在
    const targetDir = savePath === SETTINGS_FILE ? CLAUDE_DIR : AAR_DIR;
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // 写入配置
    const jsonString = JSON.stringify(mergedConfig, null, 2);
    writeFileSync(savePath, jsonString, 'utf-8');

    console.log('[IDE Save] Configuration saved:', {
      saveType,
      savePath,
      isCurrentGatewayApplied,
      config: saveType === 'temp' ? mergedConfig : {
        baseUrl: mergedConfig.env?.ANTHROPIC_BASE_URL,
        hasApiKey: !!mergedConfig.env?.ANTHROPIC_AUTH_TOKEN,
        modelMapping: {
          haiku: mergedConfig.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL,
          sonnet: mergedConfig.env?.ANTHROPIC_DEFAULT_SONNET_MODEL,
          opus: mergedConfig.env?.ANTHROPIC_DEFAULT_OPUS_MODEL,
          default: mergedConfig.env?.ANTHROPIC_MODEL,
          reasoning: mergedConfig.env?.ANTHROPIC_REASONING_MODEL,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: saveType === 'applied'
        ? '配置已更新到 Claude Code'
        : '配置已保存（临时）',
      saveType,
      savePath: savePath === SETTINGS_FILE ? '~/.claude/settings.json' : '~/.aar/settings.tmp.json',
      config: mergedConfig,
    });
  } catch (error: any) {
    console.error('IDE Save API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

/**
 * 获取当前网关地址（从数据库读取）
 */
function getGatewayAddress(): string {
  getDatabase();
  const portConfig = getConfig('port');
  const port = portConfig?.value || '1357';
  return `http://localhost:${port}`;
}

/**
 * 获取当前网关 API Key（从数据库读取）
 */
function getGatewayApiKey(): string {
  getDatabase();
  const apiKeyConfig = getConfig('api_key');
  return apiKeyConfig?.value || 'your-gateway-api-key';
}

/**
 * 生成完整的 Claude 配置（用于更新 settings.json）
 */
function generateClaudeConfig(
  gatewayAddress: string,
  gatewayApiKey: string,
  modelMapping: SaveRequest
): any {
  return {
    router_provider: 'aar',
    env: {
      ANTHROPIC_AUTH_TOKEN: gatewayApiKey,
      ANTHROPIC_BASE_URL: gatewayAddress,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: modelMapping.haiku,
      ANTHROPIC_DEFAULT_OPUS_MODEL: modelMapping.opus,
      ANTHROPIC_DEFAULT_SONNET_MODEL: modelMapping.sonnet,
      ANTHROPIC_MODEL: modelMapping.default,
      ANTHROPIC_REASONING_MODEL: modelMapping.reasoning,
      API_TIMEOUT_MS: '3000000',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
      hasCompletedOnboarding: true,
    },
  };
}
