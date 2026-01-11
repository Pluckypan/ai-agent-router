import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/database';
import { serviceManager } from '@/server/service-manager';

// Ensure Node.js runtime (required for service manager)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Initialize database
    getDatabase();
    
    const result = await serviceManager.stop();
    
    if (result.error) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Service stop API error:', error);
    return NextResponse.json(
      { status: 'stopped', error: error.message || 'Failed to stop service' },
      { status: 500 }
    );
  }
}
