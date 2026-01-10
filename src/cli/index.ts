#!/usr/bin/env node

import { Command } from 'commander';
import next from 'next';
import { parse } from 'url';
import http from 'http';

const program = new Command();

program
  .name('aar')
  .description('AI Agent Router - Unified gateway for managing multiple AI model providers')
  .version('0.1.0');

program
  .command('start')
  .description('Start the API gateway server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('--hostname <hostname>', 'Hostname to listen on', 'localhost')
  .action(async (options) => {
    const port = parseInt(options.port || '3000');
    const hostname = options.hostname || 'localhost';

    // Initialize database
    const { getDatabase } = require('../db/database');
    getDatabase(); // Initialize on startup

    // Check if port is already in use
    const testServer = http.createServer();
    await new Promise<void>((resolve, reject) => {
      testServer.listen(port, hostname, () => {
        testServer.close(() => resolve());
      });
      testServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Error: Port ${port} is already in use.`);
          process.exit(1);
        }
        reject(err);
      });
    });

    console.log(`Starting AI Agent Router on http://${hostname}:${port}`);
    console.log(`Web UI: http://${hostname}:${port}`);
    console.log(`API Gateway: http://${hostname}:${port}/api/gateway`);

    // Start Next.js server
    const dev = process.env.NODE_ENV !== 'production';
    const app = next({ dev, hostname, port });
    const handle = app.getRequestHandler();

    app.prepare().then(() => {
      const server = http.createServer((req: any, res: any) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
      });

      server.listen(port, hostname, () => {
        console.log(`✓ Server ready on http://${hostname}:${port}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
          console.log('HTTP server closed');
          require('../db/database').closeDatabase();
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('\nSIGINT signal received: closing HTTP server');
        server.close(() => {
          console.log('HTTP server closed');
          require('../db/database').closeDatabase();
          process.exit(0);
        });
      });
    });
  });

program
  .command('config')
  .description('Manage gateway configuration')
  .option('--get <key>', 'Get configuration value')
  .option('--set <key> <value>', 'Set configuration value')
  .action(async (options) => {
    const { getConfig, setConfig } = require('../db/queries');
    
    if (options.get) {
      const config = getConfig(options.get);
      if (config) {
        console.log(config.value);
      } else {
        console.error(`Config key "${options.get}" not found`);
        process.exit(1);
      }
    } else if (options.set) {
      const [key, value] = options.set.split(' ');
      if (!key || !value) {
        console.error('Usage: --set <key> <value>');
        process.exit(1);
      }
      setConfig(key, value);
      console.log(`Config "${key}" set to "${value}"`);
    } else {
      program.help();
    }
  });

program.parse();
