import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Claude settings.json 文件路径
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');
const BACKUP_FILE = join(CLAUDE_DIR, 'settings.json.aar.bak');

// 默认模型映射
export const DEFAULT_MODEL_MAPPING = {
  haiku: 'GLM-4.5-air',
  sonnet: 'MiniMax-M2.1',
  opus: 'GLM-4.7',
  default: 'GLM-4.7',
} as const;

/**
 * 应用 Claude IDE 配置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { haiku, sonnet, opus } = body;

    // 验证请求参数
    if (haiku === undefined || sonnet === undefined || opus === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: haiku, sonnet, opus' },
        { status: 400 }
      );
    }

    // 获取当前网关地址
    const gatewayAddress = getGatewayAddress();

    // 生成配置对象
    const config = generateClaudeConfig(gatewayAddress, { haiku, sonnet, opus });

    // 备份原有配置
    const backupResult = backupOriginalConfig();
    if (!backupResult.success) {
      return NextResponse.json(
        { error: backupResult.error },
        { status: 500 }
      );
    }

    // 确保目录存在
    if (!existsSync(CLAUDE_DIR)) {
      mkdirSync(CLAUDE_DIR, { recursive: true });
    }

    // 验证并写入新配置
    const validationResult = validateAndWriteConfig(config);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration applied successfully',
      config,
      backup: backupResult.existed ? 'Created backup' : 'No existing config to backup',
    });
  } catch (error: any) {
    console.error('IDE Apply API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

/**
 * 获取当前网关地址
 */
function getGatewayAddress(): string {
  const host = process.env.GATEWAY_HOST || 'localhost';
  const port = process.env.GATEWAY_PORT || process.env.PORT || '3000';
  return `http://${host}:${port}`;
}

/**
 * 生成 Claude 配置
 */
function generateClaudeConfig(
  gatewayAddress: string,
  modelMapping: { haiku: string; sonnet: string; opus: string }
): any {
  return {
    env: {
      ANTHROPIC_AUTH_TOKEN: process.env.GATEWAY_API_KEY || 'your-gateway-api-key',
      ANTHROPIC_BASE_URL: gatewayAddress,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: modelMapping.haiku,
      ANTHROPIC_DEFAULT_OPUS_MODEL: modelMapping.opus,
      ANTHROPIC_DEFAULT_SONNET_MODEL: modelMapping.sonnet,
      ANTHROPIC_MODEL: modelMapping.default,
      ANTHROPIC_REASONING_MODEL: modelMapping.default,
      API_TIMEOUT_MS: '3000000',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
      hasCompletedOnboarding: true,
    },
  };
}

/**
 * 备份原有配置
 */
function backupOriginalConfig(): { success: boolean; existed: boolean; error?: string } {
  try {
    // 检查原有配置是否存在
    const existing = existsSync(SETTINGS_FILE);

    if (existing) {
      // 读取原有配置
      const originalConfig = readFileSync(SETTINGS_FILE, 'utf-8');

      // 写入备份文件
      writeFileSync(BACKUP_FILE, originalConfig, 'utf-8');

      return { success: true, existed: true };
    }

    return { success: true, existed: false };
  } catch (error: any) {
    return {
      success: false,
      existed: false,
      error: `Backup failed: ${error.message}`,
    };
  }
}

/**
 * 验证并写入配置
 */
function validateAndWriteConfig(config: any): { success: boolean; error?: string } {
  try {
    // 序列化为 JSON 验证格式
    const jsonString = JSON.stringify(config, null, 2);

    // 验证是否能解析
    JSON.parse(jsonString);

    // 写入文件
    writeFileSync(SETTINGS_FILE, jsonString, 'utf-8');

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: `Validation or write failed: ${error.message}`,
    };
  }
}
