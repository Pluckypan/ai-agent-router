import { exec } from 'child_process';
import { promisify } from 'util';
import { getServiceStatus, setServiceStatus, updateServiceStatus, getConfig } from '@/db/queries';
import { getDatabase } from '@/db/database';
import { GatewayServer } from './gateway-server';
import net from 'net';

const execAsync = promisify(exec);

export interface ServiceStatusResponse {
  status: 'running' | 'stopped';
  port?: number;
  pid?: number | null;
  started_at?: string | null;
  error?: string;
}

class ServiceManager {
  private gatewayServer: GatewayServer | null = null;
  private isStarting: boolean = false;

  /**
   * Check if a process with given PID exists
   */
  private async checkProcessExists(pid: number): Promise<boolean> {
    try {
      // Use 'ps' command to check if process exists
      // This works on Unix-like systems (macOS, Linux)
      await execAsync(`ps -p ${pid} -o pid=`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a port is available
   */
  private async checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Check if a port is in use and get process info
   */
  private async checkPortInUse(port: number): Promise<{ inUse: boolean; processInfo?: string }> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.listen(port, () => {
        server.once('close', () => resolve({ inUse: false }));
        server.close();
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          // Try to get process info
          execAsync(`lsof -ti:${port} 2>/dev/null || echo ''`)
            .then(({ stdout }) => {
              const pid = stdout.trim();
              if (pid) {
                resolve({ inUse: true, processInfo: `Port ${port} is in use by process ${pid}` });
              } else {
                resolve({ inUse: true, processInfo: `Port ${port} is already in use` });
              }
            })
            .catch(() => {
              resolve({ inUse: true, processInfo: `Port ${port} is already in use` });
            });
        } else {
          resolve({ inUse: false });
        }
      });
    });
  }

  /**
   * Get current service status, verifying process existence
   */
  async getStatus(): Promise<ServiceStatusResponse> {
    const dbStatus = getServiceStatus();

    if (!dbStatus) {
      return { status: 'stopped' };
    }

    // If status is running, verify process actually exists
    if (dbStatus.status === 'running' && dbStatus.pid) {
      const processExists = await this.checkProcessExists(dbStatus.pid);
      if (!processExists) {
        // Process doesn't exist, update database
        updateServiceStatus({ status: 'stopped', pid: null });
        return { status: 'stopped' };
      }
    }

    return {
      status: dbStatus.status,
      port: dbStatus.port,
      pid: dbStatus.pid,
      started_at: dbStatus.started_at,
    };
  }

  /**
   * Start gateway service
   */
  async start(port: number): Promise<ServiceStatusResponse> {
    // Prevent concurrent starts
    if (this.isStarting) {
      return { status: 'stopped', error: 'Service is already starting' };
    }

    // Check if service is already running
    const currentStatus = await this.getStatus();
    if (currentStatus.status === 'running') {
      return { status: 'running', error: 'Service is already running', port: currentStatus.port, pid: currentStatus.pid };
    }

    // Check port availability
    const portCheck = await this.checkPortInUse(port);
    if (portCheck.inUse) {
      return { status: 'stopped', error: portCheck.processInfo || `Port ${port} is already in use` };
    }

    this.isStarting = true;

    try {
      // Initialize database
      try {
        getDatabase();
      } catch (error: any) {
        console.error('Failed to initialize database:', error);
        this.isStarting = false;
        return { status: 'stopped', error: 'Failed to initialize database' };
      }

      // Get API key from config if configured
      const apiKeyConfig = getConfig('api_key');
      const apiKey = apiKeyConfig ? apiKeyConfig.value : undefined;

      // Create and start gateway server directly in-process
      const server = new GatewayServer({
        port,
        hostname: 'localhost',
        apiKey,
      });

      await server.start();
      this.gatewayServer = server;

      // Use current process PID
      const pid = process.pid;
      const startedAt = new Date().toISOString();

      setServiceStatus({
        status: 'running',
        port,
        pid,
        started_at: startedAt,
      });

      this.isStarting = false;

      console.log(`Gateway server started on port ${port}`);

      return {
        status: 'running',
        port,
        pid,
        started_at: startedAt,
      };
    } catch (error: any) {
      this.isStarting = false;
      this.gatewayServer = null;
      console.error(`Failed to start gateway service: ${error.message}`);
      return { status: 'stopped', error: error.message || 'Failed to start service' };
    }
  }

  /**
   * Stop the gateway service
   */
  async stop(): Promise<ServiceStatusResponse> {
    const currentStatus = await this.getStatus();

    if (currentStatus.status === 'stopped') {
      return { status: 'stopped' };
    }

    try {
      // If we have a reference to gateway server, stop it
      if (this.gatewayServer) {
        await this.gatewayServer.stop();
        this.gatewayServer = null;
      } else if (currentStatus.pid && currentStatus.pid !== process.pid) {
        // Only try to kill by PID if it's a different process
        try {
          process.kill(currentStatus.pid, 'SIGTERM');
        } catch (error) {
          // Process might not exist
          console.warn(`Failed to kill process ${currentStatus.pid}:`, error);
        }
      }

      // Update database status
      updateServiceStatus({ status: 'stopped', pid: null });

      return { status: 'stopped' };
    } catch (error: any) {
      return { status: 'stopped', error: error.message || 'Failed to stop service' };
    }
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager();
