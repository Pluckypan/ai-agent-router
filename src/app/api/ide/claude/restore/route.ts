import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, copyFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Claude settings.json 文件路径
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');
const BACKUP_FILE = join(CLAUDE_DIR, 'settings.json.aar.bak');

/**
 * 还原 Claude IDE 配置
 */
export async function POST(request: NextRequest) {
  try {
    // 检查备份文件是否存在
    const backupExists = existsSync(BACKUP_FILE);

    if (!backupExists) {
      return NextResponse.json(
        { error: 'No backup file found. Please apply configuration first before restoring.' },
        { status: 404 }
      );
    }

    // 读取备份文件
    const backupContent = readFileSync(BACKUP_FILE, 'utf-8');

    // 确保目录存在
    if (!existsSync(CLAUDE_DIR)) {
      return NextResponse.json(
        { error: 'Claude config directory does not exist' },
        { status: 500 }
      );
    }

    // 将备份内容复制到原配置文件
    copyFileSync(BACKUP_FILE, SETTINGS_FILE);

    // 尝试解析备份内容以验证格式
    let parsedBackup: any;
    try {
      parsedBackup = JSON.parse(backupContent);
    } catch (error: any) {
      return NextResponse.json(
        {
          error: 'Backup file is corrupted or invalid JSON',
          backupContent  // 返回原始内容供调试
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration restored successfully',
      config: parsedBackup,
    });
  } catch (error: any) {
    console.error('IDE Restore API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

/**
 * 删除备份文件（可选功能）
 */
export async function DELETE(request: NextRequest) {
  try {
    // 检查备份文件是否存在
    if (!existsSync(BACKUP_FILE)) {
      return NextResponse.json(
        { error: 'No backup file found' },
        { status: 404 }
      );
    }

    // 删除备份文件
    unlinkSync(BACKUP_FILE);

    return NextResponse.json({
      success: true,
      message: 'Backup file deleted successfully',
    });
  } catch (error: any) {
    console.error('IDE Delete Backup API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
