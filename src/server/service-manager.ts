import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import { getServiceStatus, setServiceStatus, updateServiceStatus, clearServiceStatus } from '@/db/queries';
import path from 'path';
import fs from 'fs';
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
  private childProcess: ChildProcess | null = null;
  private isStarting: boolean = false;

  /**
   * Check if a process with the given PID exists
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
   * Start the gateway service
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

    // Check port availability with more details
    const portCheck = await this.checkPortInUse(port);
    if (portCheck.inUse) {
      // In development, if port 3000 is in use, suggest using a different port
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev && port === 3000) {
        return { 
          status: 'stopped', 
          error: `Port 3000 is already in use (likely by the development server). Please configure a different port (e.g., 3001) in the settings.` 
        };
      }
      return { status: 'stopped', error: portCheck.processInfo || `Port ${port} is already in use` };
    }

    this.isStarting = true;

    try {
      const cliPath = path.join(process.cwd(), 'dist', 'cli', 'index.js');
      const tsCliPath = path.join(process.cwd(), 'src', 'cli', 'index.ts');
      
      let child: ChildProcess;

      // Create isolated environment for child process
      // Remove Next.js dev server specific env vars to avoid conflicts
      const childEnv = { ...process.env };
      // Remove PORT if it might conflict
      if (childEnv.PORT && parseInt(childEnv.PORT) === 3000) {
        delete childEnv.PORT;
      }
      // Remove Next.js specific env vars that might cause conflicts
      delete childEnv.NEXT_TELEMETRY_DISABLED;
      // Gateway server doesn't need Next.js, so we can use any NODE_ENV
      childEnv.NODE_ENV = process.env.NODE_ENV || 'production';

      // Check if compiled code exists
      if (fs.existsSync(cliPath)) {
        // Use compiled JavaScript
        child = spawn(process.execPath, [cliPath, 'start', '-p', port.toString()], {
          detached: false, // Keep attached for proper tracking
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: process.cwd(),
          env: childEnv,
        });
      } else if (fs.existsSync(tsCliPath)) {
        // In development, try to use tsx via npx
        // Note: tsx should be installed as dev dependency for this to work
        child = spawn('npx', ['--yes', 'tsx', tsCliPath, 'start', '-p', port.toString()], {
          detached: false, // Keep attached for proper tracking
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: process.cwd(),
          env: childEnv,
          shell: true, // Use shell to resolve npx
        });
      } else {
        this.isStarting = false;
        return { 
          status: 'stopped', 
          error: 'CLI not found. Please run "npm run build" first, or ensure src/cli/index.ts exists.' 
        };
      }

      this.childProcess = child;

      // Collect error output for better error messages
      let errorOutput = '';
      let hasExited = false;
      let exitCode: number | null = null;

      // Handle process output (optional, for debugging)
      // Use setImmediate to avoid blocking the event loop
      child.stdout?.on('data', (data) => {
        setImmediate(() => {
          const output = data.toString();
          // Only log if it's not empty and not just whitespace
          if (output.trim()) {
            console.log(`[Gateway Service] ${output}`);
          }
        });
      });

      child.stderr?.on('data', (data) => {
        setImmediate(() => {
          const errorText = data.toString();
          console.error(`[Gateway Service Error] ${errorText}`);
          errorOutput += errorText;
        });
      });

      // Handle process exit
      child.on('exit', (code, signal) => {
        hasExited = true;
        exitCode = code;
        console.log(`[Gateway Service] Process exited with code ${code}, signal ${signal}`);
        this.childProcess = null;
        this.isStarting = false;
        
        // Update database status
        updateServiceStatus({ status: 'stopped', pid: null });
      });

      // Wait a bit to see if process starts successfully
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if process exited during startup
      if (hasExited || child.killed || child.exitCode !== null) {
        this.isStarting = false;
        this.childProcess = null;
        
        // Extract meaningful error message
        let errorMessage = 'Service failed to start';
        if (errorOutput) {
          // Try to extract the main error message
          const errorMatch = errorOutput.match(/Error: ([^\n]+)/);
          if (errorMatch) {
            errorMessage = errorMatch[1];
          } else if (errorOutput.includes('production build')) {
            errorMessage = 'Production build not found. Please run "npm run build" first, or use development mode.';
          } else {
            // Use first meaningful line of error
            const lines = errorOutput.split('\n').filter(line => line.trim());
            if (lines.length > 0) {
              errorMessage = lines[0].substring(0, 200); // Limit length
            }
          }
        }
        
        return { status: 'stopped', error: errorMessage };
      }

      // Save status to database
      const pid = child.pid || null;
      const startedAt = new Date().toISOString();
      setServiceStatus({
        status: 'running',
        port,
        pid,
        started_at: startedAt,
      });

      this.isStarting = false;

      return {
        status: 'running',
        port,
        pid,
        started_at: startedAt,
      };
    } catch (error: any) {
      this.isStarting = false;
      this.childProcess = null;
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
      // If we have a reference to the child process, kill it
      if (this.childProcess) {
        this.childProcess.kill('SIGTERM');
        this.childProcess = null;
      } else if (currentStatus.pid) {
        // Try to kill by PID
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
