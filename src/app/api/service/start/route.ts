import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/database';
import { serviceManager } from '@/server/service-manager';
import { getConfig } from '@/db/queries';
import net from 'net';

// Ensure Node.js runtime (required for service manager)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Initialize database
    getDatabase();
    
    const body = await request.json().catch(() => ({}));
    const port = body.port ? parseInt(body.port, 10) : null;

    // Get port from config if not provided
    let targetPort = port;
    if (!targetPort) {
      const portConfig = getConfig('port');
      targetPort = portConfig ? parseInt(portConfig.value, 10) : 3000;
    }

    // In development, if port is 3000 (default dev server port), check for conflict
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && targetPort === 3000) {
      // Check if port 3000 is in use (likely by the dev server)
      const testServer = net.createServer();
      const portInUse = await new Promise<boolean>((resolve) => {
        testServer.listen(3000, () => {
          testServer.close(() => resolve(false));
        });
        testServer.on('error', () => resolve(true));
        setTimeout(() => {
          testServer.close(() => resolve(false));
        }, 100);
      });

      if (portInUse) {
        return NextResponse.json(
          { 
            status: 'stopped', 
            error: 'Port 3000 is already in use by the development server. Please configure a different port (e.g., 3001) in the settings above.' 
          },
          { status: 400 }
        );
      }
    }

    // Validate port
    if (isNaN(targetPort) || targetPort < 1 || targetPort > 65535) {
      return NextResponse.json(
        { status: 'stopped', error: 'Invalid port number' },
        { status: 400 }
      );
    }

    const result = await serviceManager.start(targetPort);
    
    if (result.error) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Service start API error:', error);
    return NextResponse.json(
      { status: 'stopped', error: error.message || 'Failed to start service' },
      { status: 500 }
    );
  }
}
