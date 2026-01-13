import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/database';
import { getConfig, setConfig, getAllConfig } from '@/db/queries';

// Ensure Node.js runtime (required for SQLite)
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Initialize database on request (safer than module load)
    getDatabase();

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      const config = getConfig(key);
      if (!config) {
        return NextResponse.json(
          { error: 'Config not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(config);
    }

    const configs = getAllConfig();
    return NextResponse.json(configs);
  } catch (error: any) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize database on request
    getDatabase();

    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      );
    }

    // Allow value to be null, undefined, or empty string (save as empty string)
    const config = setConfig(key, (value === undefined || value === null) ? '' : typeof value === 'string' ? value : JSON.stringify(value));

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Config POST API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
