/**
 * Standalone Gateway Server
 * This server only provides API gateway functionality for external clients
 * It does NOT include the Web UI
 */

import http from 'http';
import { getDatabase, closeDatabase } from '../db/database';
import { handleGatewayRequest } from './gateway';
import { getConfig } from '../db/queries';
import type { GatewayRequest, GatewayResponse } from './providers/types';

interface GatewayServerOptions {
  port: number;
  hostname?: string;
  apiKey?: string;
}

export class GatewayServer {
  private server: http.Server | null = null;
  private port: number;
  private hostname: string;
  private apiKey: string | null;

  constructor(options: GatewayServerOptions) {
    this.port = options.port;
    this.hostname = options.hostname || 'localhost';
    this.apiKey = options.apiKey || null;
  }

  /**
   * Validate API key if configured
   */
  private validateApiKey(authHeader: string | null): boolean {
    if (!this.apiKey) {
      return true; // No API key configured, allow all requests
    }

    if (!authHeader) {
      return false;
    }

    // Support both "Bearer <key>" and direct key
    const key = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    return key === this.apiKey;
  }

  /**
   * Parse request body
   */
  private async parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        if (!body) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Handle gateway request
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[Gateway Server ${requestId}] Incoming request:`, {
      method: req.method,
      url: req.url,
      headers: {
        'content-type': req.headers['content-type'],
        'authorization': req.headers['authorization'] ? '***' : undefined,
      },
    });

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      console.log(`[Gateway Server ${requestId}] Handling OPTIONS preflight`);
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      // Validate API key if configured
      const authHeader = req.headers.authorization || req.headers['x-api-key'] as string || null;
      if (!this.validateApiKey(authHeader)) {
        console.log(`[Gateway Server ${requestId}] API key validation failed`);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid or missing API key' } }));
        return;
      }

      // Parse URL
      const url = new URL(req.url || '/', `http://${this.hostname}:${this.port}`);
      const pathname = url.pathname;
      console.log(`[Gateway Server ${requestId}] Parsed URL:`, {
        pathname,
        searchParams: Object.fromEntries(url.searchParams.entries()),
      });

      // Parse body first to get model ID
      let body: any = null;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        body = await this.parseBody(req);
        console.log(`[Gateway Server ${requestId}] Parsed body:`, body ? JSON.stringify(body).substring(0, 200) : 'null');
      }

      // Get model ID from query, body, or URL path
      // Priority: query param > body > path segment
      let modelId = url.searchParams.get('model') || 
                   url.searchParams.get('model_id') ||
                   null;

      // Get provider name (optional, for disambiguating models with same model_id)
      const providerName = url.searchParams.get('provider') || null;

      console.log(`[Gateway Server ${requestId}] Model ID from query:`, modelId);
      console.log(`[Gateway Server ${requestId}] Provider from query:`, providerName);

      // Try to get from body if not in query
      if (!modelId && body) {
        modelId = body.model || body.model_id || null;
        console.log(`[Gateway Server ${requestId}] Model ID from body:`, modelId);
      }
      // Also get provider from body if not in query
      const bodyProvider = body?.provider || null;
      if (bodyProvider) {
        console.log(`[Gateway Server ${requestId}] Provider from body:`, bodyProvider);
      }

      // Try to get from URL path (e.g., /v1/models/{model_id}/...)
      if (!modelId && pathname) {
        const pathMatch = pathname.match(/\/(?:v1|api\/gateway)\/models\/([^\/]+)/);
        if (pathMatch) {
          modelId = pathMatch[1];
          console.log(`[Gateway Server ${requestId}] Model ID from path:`, modelId);
        }
      }

      if (!modelId) {
        console.log(`[Gateway Server ${requestId}] Error: Model ID not found`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: { 
            message: 'Model ID not specified. Please provide model ID in query parameter (?model=xxx), request body, or URL path.' 
          } 
        }));
        return;
      }

      console.log(`[Gateway Server ${requestId}] Processing request for model:`, modelId, 'provider:', providerName || bodyProvider || 'not specified');

      // Build gateway request
      const gatewayRequest: GatewayRequest = {
        method: req.method || 'GET',
        path: pathname,
        headers: req.headers as Record<string, string>,
        query: Object.fromEntries(url.searchParams.entries()),
        body: body,
      };

      // Handle the request (pass provider name if specified)
      const finalProviderName = providerName || bodyProvider;
      console.log(`[Gateway Server ${requestId}] Calling handleGatewayRequest with model:`, modelId, 'provider:', finalProviderName || 'undefined');
      
      const response = await handleGatewayRequest(modelId, gatewayRequest, finalProviderName || undefined);

      console.log(`[Gateway Server ${requestId}] Response received:`, {
        status: response.status,
        bodyType: typeof response.body,
        bodyPreview: typeof response.body === 'string' 
          ? response.body.substring(0, 200) 
          : JSON.stringify(response.body).substring(0, 200),
      });

      // Send response
      // If body is already a string, send it directly; otherwise stringify it
      let responseBody: string;
      if (response.body === null || response.body === undefined) {
        responseBody = '';
      } else if (typeof response.body === 'string') {
        responseBody = response.body;
      } else {
        responseBody = JSON.stringify(response.body);
      }
      
      const duration = Date.now() - startTime;
      console.log(`[Gateway Server ${requestId}] Sending response (${duration}ms):`, {
        status: response.status,
        bodyLength: responseBody.length,
      });
      
      res.writeHead(response.status, response.headers);
      res.end(responseBody);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[Gateway Server ${requestId}] Error (${duration}ms):`, {
        message: error.message,
        stack: error.stack,
      });
      
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: {
            message: error.message || 'Internal server error',
            type: 'gateway_error',
          },
        }));
      }
    }
  }

  /**
   * Start the gateway server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Initialize database
      try {
        getDatabase();
      } catch (error: any) {
        reject(new Error(`Failed to initialize database: ${error.message}`));
        return;
      }

      this.server = http.createServer((req, res) => {
        console.log(`[Gateway Server] New connection from ${req.socket.remoteAddress}:${req.socket.remotePort}`);
        this.handleRequest(req, res).catch((error) => {
          console.error('[Gateway Server] Unhandled request error:', error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Internal server error' } }));
          }
        });
      });

      this.server.listen(this.port, this.hostname, () => {
        console.log(`✓ Gateway server ready on http://${this.hostname}:${this.port}`);
        console.log(`  API Gateway: http://${this.hostname}:${this.port}/api/gateway`);
        if (this.apiKey) {
          console.log(`  API Key authentication: Enabled`);
        }
        resolve();
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use`));
        } else {
          reject(error);
        }
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        this.stop();
      });

      process.on('SIGINT', () => {
        this.stop();
      });
    });
  }

  /**
   * Stop the gateway server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Gateway server closed');
          closeDatabase();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
