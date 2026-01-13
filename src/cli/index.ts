#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'child_process';
import path from 'path';

const program = new Command();

program
  .name('aar')
  .description('AI Agent Router - Web UI for managing the API gateway')
  .version('0.1.0');

program
  .command('start')
  .description('Start the Web UI management interface')
  .option('-p, --port <port>', 'Port for Web UI', '9527')
  .action(async (options) => {
    const port = parseInt(options.port || '9527');

    console.log(`Starting AI Agent Router Web UI`);
    console.log(`  Port: ${port}`);
    console.log(`  Access the UI at: http://localhost:${port}`);
    console.log('');

    // Start Web UI using Next.js
    const isDev = process.env.NODE_ENV !== 'production';
    let uiProcess: ReturnType<typeof spawn>;

    if (isDev) {
      // In development mode, use next dev
      uiProcess = spawn('npm', ['run', 'dev', '--', '-p', port.toString()], {
        cwd: process.cwd(),
        stdio: ['ignore', 'inherit', 'inherit'],
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', PORT: port.toString() },
      });
    } else {
      // In production mode, start the built Next.js app
      const serverPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
      uiProcess = spawn(process.execPath, [serverPath, 'start', '-p', port.toString()], {
        cwd: process.cwd(),
        stdio: ['ignore', 'inherit', 'inherit'],
        env: { ...process.env, PORT: port.toString(), NODE_ENV: 'production' },
      });
    }

    // Handle UI process exit
    uiProcess.on('exit', (code) => {
      console.log(`Web UI process exited with code ${code}`);
      process.exit(code || 0);
    });

    uiProcess.on('error', (error) => {
      console.error(`Failed to start Web UI: ${error.message}`);
      process.exit(1);
    });

    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      uiProcess.kill('SIGTERM');
      process.exit(0);
    });
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
