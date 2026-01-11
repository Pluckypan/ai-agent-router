#!/usr/bin/env node

import { Command } from 'commander';
import { GatewayServer } from '../server/gateway-server';
import { getDatabase } from '../db/database';
import { getConfig, setConfig } from '../db/queries';

const program = new Command();

program
  .name('aar')
  .description('AI Agent Router - Unified gateway for managing multiple AI model providers')
  .version('0.1.0');

program
  .command('start')
  .description('Start the API gateway server (gateway only, no Web UI)')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('--hostname <hostname>', 'Hostname to listen on', 'localhost')
  .action(async (options) => {
    const port = parseInt(options.port || '3000');
    const hostname = options.hostname || 'localhost';

    // Initialize database to get config
    try {
      getDatabase();
    } catch (error: any) {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    }

    // Get API key from config if configured
    const apiKeyConfig = getConfig('api_key');
    const apiKey = apiKeyConfig ? apiKeyConfig.value : undefined;

    console.log(`Starting AI Agent Router Gateway Server`);
    console.log(`  Port: ${port}`);
    console.log(`  Hostname: ${hostname}`);
    if (apiKey) {
      console.log(`  API Key: Configured (authentication enabled)`);
    } else {
      console.log(`  API Key: Not configured (authentication disabled)`);
    }

    // Create and start gateway server
    const server = new GatewayServer({
      port,
      hostname,
      apiKey,
    });

    try {
      await server.start();
    } catch (error: any) {
      console.error(`Failed to start gateway server: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Manage gateway configuration')
  .option('--get <key>', 'Get configuration value')
  .option('--set <key> <value>', 'Set configuration value')
  .action(async (options) => {
    // Initialize database
    try {
      getDatabase();
    } catch (error: any) {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    }
    
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
