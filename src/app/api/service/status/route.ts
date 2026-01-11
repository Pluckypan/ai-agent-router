import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/database';
import { serviceManager } from '@/server/service-manager';

// Ensure Node.js runtime (required for service manager)
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Initialize database
    getDatabase();
    
    const status = await serviceManager.getStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Service status API error:', error);
    return NextResponse.json(
      { status: 'stopped', error: error.message || 'Failed to get service status' },
      { status: 500 }
    );
  }
}
