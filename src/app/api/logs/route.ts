import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/database';
import { getRequestLogs, getRequestLogById, getRequestLogCount } from '@/db/queries';

// Ensure Node.js runtime (required for SQLite)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    getDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const modelId = searchParams.get('model_id');

    if (id) {
      const log = getRequestLogById(parseInt(id));
      if (!log) {
        return NextResponse.json(
          { error: 'Log not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(log);
    }

    const logs = getRequestLogs(
      limit,
      offset,
      modelId ? parseInt(modelId) : undefined
    );
    const total = getRequestLogCount(modelId ? parseInt(modelId) : undefined);

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Logs API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
