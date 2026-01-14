import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync, spawnSync } from 'child_process';

// Claude settings.json 文件路径
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');

/**
 * 测试 Claude Code 配置是否正常工作
 * 通过执行 claude -p "say 'success'" 命令来验证
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

    // 检查关键配置字段（只要有必要的配置就可以测试）
    const checks: { [key: string]: boolean } = {
      hasBaseUrl: !!baseUrl,
      hasApiKey: !!apiKey,
    };

    const allChecksPassed = Object.values(checks).every(v => v);

    // 执行 claude 命令测试
    let claudeTest = { success: false, message: '', error: '', output: '' };
    if (allChecksPassed) {
      try {
        // 首先检查 claude 命令是否存在
        const whichResult = spawnSync('which', ['claude'], { encoding: 'utf-8' });
        if (whichResult.status !== 0) {
          throw new Error('claude command not found. Please install Claude CLI.');
        }
        console.log('Claude CLI found:', whichResult.stdout.trim());

        // 执行 claude -p "say 'success'" 命令
        const testCommand = 'claude -p "say success"';
        console.log('Executing test command:', testCommand);

        const output = execSync(testCommand, {
          encoding: 'utf-8',
          timeout: 180000, // 3 分钟超时
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        claudeTest = {
          success: true,
          message: 'Claude command executed successfully',
          output: output.trim(),
        };
      } catch (error: any) {
        console.error('Claude test error:', error);
        const errorMsg = error.stderr?.trim() || error.stdout?.trim() || error.message || 'Unknown error';
        claudeTest = {
          success: false,
          error: `Claude command failed: ${errorMsg}`,
          output: error.stdout?.trim() || '',
        };
      }
    }

    const finalSuccess = claudeTest.success && claudeTest.output?.includes('success');

    return NextResponse.json({
      success: finalSuccess,
      checks,
      claudeTest,
      configSummary: {
        baseUrl,
        apiKey: apiKey ? apiKey.slice(0, 4) + '****' + apiKey.slice(-4) : 'missing',
        haikuModel: env.ANTHROPIC_DEFAULT_HAIKU_MODEL || 'not set',
        sonnetModel: env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'not set',
        opusModel: env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'not set',
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
