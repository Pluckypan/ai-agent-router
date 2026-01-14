import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawnSync, spawn } from 'child_process';

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
    const claudeTest = await new Promise<{ success: boolean; message: string; error: string; output: string }>((resolve) => {
      if (!allChecksPassed) {
        resolve({ success: false, message: '', error: 'Prerequisite checks failed', output: '' });
        return;
      }

      try {
        // 首先检查 claude 命令是否存在
        const whichResult = spawnSync('which', ['claude'], { encoding: 'utf-8' });
        if (whichResult.status !== 0) {
          resolve({
            success: false,
            message: '',
            error: 'claude command not found. Please install Claude CLI.',
            output: '',
          });
          return;
        }

        console.log('Claude CLI found:', whichResult.stdout.trim());
        console.log('Executing test command: claude -p "say success"');

        const child = spawn('claude', ['-p', 'say success'], {
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        const onAbort = () => {
          console.log('Request aborted, killing Claude test process...');
          child.kill('SIGKILL');
        };

        request.signal.addEventListener('abort', onAbort);

        const timeout = setTimeout(() => {
          child.kill('SIGKILL');
          resolve({
            success: false,
            message: '',
            error: 'Command timed out after 3 minutes',
            output: stdout.trim(),
          });
        }, 180000);

        child.on('close', (code: number | null) => {
          clearTimeout(timeout);
          request.signal.removeEventListener('abort', onAbort);
          
          if (code === 0) {
            resolve({
              success: true,
              message: 'Claude command executed successfully',
              error: '',
              output: stdout.trim(),
            });
          } else {
            const errorMsg = stderr.trim() || stdout.trim() || `Process exited with code ${code}`;
            resolve({
              success: false,
              message: '',
              error: `Claude command failed: ${errorMsg}`,
              output: stdout.trim(),
            });
          }
        });

        child.on('error', (err: Error) => {
          clearTimeout(timeout);
          request.signal.removeEventListener('abort', onAbort);
          resolve({
            success: false,
            message: '',
            error: `Failed to start process: ${err.message}`,
            output: '',
          });
        });

      } catch (error: any) {
        console.error('Claude test error:', error);
        resolve({
          success: false,
          message: '',
          error: error.message || 'Unknown error during execution',
          output: '',
        });
      }
    });

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
