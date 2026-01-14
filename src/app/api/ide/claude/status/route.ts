import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getDatabase } from '@/db/database';
import { getConfig } from '@/db/queries';

// Claude settings.json 文件路径
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');
const BACKUP_FILE = join(CLAUDE_DIR, 'settings.json.aar.bak');

// 默认模型映射（与 apply API 保持一致）
export const DEFAULT_MODEL_MAPPING = {
  haiku: 'GLM-4.5-air',
  sonnet: 'MiniMax-M2.1',
  opus: 'GLM-4.7',
  default: 'GLM-4.7',
} as const;

type ConfigStatus = {
  applied: boolean;
  modelMapping: { haiku?: string; sonnet?: string; opus?: string };
  gatewayAddress?: string;
  apiKey?: string;
  lastUpdated?: string;
  backupExists: boolean;
  matchCurrentGateway?: boolean; // 是否匹配当前网关配置
  routerProvider?: string; // 路由提供者标识，'aar' 表示配置来自当前工具
};

/**
 * 查询 Claude IDE 配置状态
 */
export async function GET(request: NextRequest) {
  try {
    const settingsFileExists = existsSync(SETTINGS_FILE);
    const backupFileExists = existsSync(BACKUP_FILE);

    // 从数据库读取当前网关配置
    getDatabase();
    const gatewayApiKeyConfig = getConfig('api_key');
    const portConfig = getConfig('port');
    const gatewayApiKey = gatewayApiKeyConfig?.value || 'your-gateway-api-key';
    const gatewayAddress = `http://localhost:${portConfig?.value || '1357'}`;

    if (!settingsFileExists) {
      // 配置文件不存在，返回未应用状态
      return NextResponse.json({
        applied: false,
        modelMapping: {},
        gatewayAddress: gatewayAddress,
        apiKey: maskApiKey(gatewayApiKey),
        backupExists: false,
        lastUpdated: undefined,
        matchCurrentGateway: false,
        routerProvider: undefined,
      });
    }

    // 读取配置文件
    const configContent = readFileSync(SETTINGS_FILE, 'utf-8');
    let config: any;
    try {
      config = JSON.parse(configContent);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Invalid settings.json format' },
        { status: 500 }
      );
    }

    // 检查配置是否匹配当前网关
    const appliedBaseUrl = config.env?.ANTHROPIC_BASE_URL;
    const appliedApiKey = config.env?.ANTHROPIC_AUTH_TOKEN;
    const matchCurrentGateway = appliedBaseUrl === gatewayAddress && appliedApiKey === gatewayApiKey;

    // 提取配置状态
    const status: ConfigStatus = {
      applied: true,
      modelMapping: extractModelMapping(config),
      gatewayAddress: appliedBaseUrl,
      apiKey: maskApiKey(appliedApiKey || gatewayApiKey),
      backupExists: backupFileExists,
      lastUpdated: getFileModTime(),
      matchCurrentGateway,
      routerProvider: config.router_provider,
    };

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('IDE Status API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

/**
 * 脱敏 API KEY
 */
function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey === 'your-gateway-api-key') {
    return apiKey;
  }
  // 只显示前4位和后4位，中间用****代替
  if (apiKey.length <= 8) {
    // 如果太短，只显示前2位和后2位
    return apiKey.slice(0, 2) + '***' + apiKey.slice(-2);
  }
  return apiKey.slice(0, 4) + '****' + apiKey.slice(-4);
}

/**
 * 从配置中提取模型映射
 */
function extractModelMapping(config: any): ConfigStatus['modelMapping'] {
  const env = config.env || {};
  const mapping: ConfigStatus['modelMapping'] = {};

  if (env.ANTHROPIC_DEFAULT_HAIKU_MODEL) {
    mapping.haiku = env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
  }
  if (env.ANTHROPIC_DEFAULT_SONNET_MODEL) {
    mapping.sonnet = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  }
  if (env.ANTHROPIC_DEFAULT_OPUS_MODEL) {
    mapping.opus = env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  }

  return mapping;
}

/**
 * 获取文件修改时间
 */
function getFileModTime(): string {
  const { statSync } = require('fs');
  try {
    const stats = statSync(SETTINGS_FILE);
    return new Date(stats.mtime).toISOString();
  } catch (error: any) {
    return undefined;
  }
}
