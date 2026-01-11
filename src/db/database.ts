import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from './schema';
import path from 'path';
import fs from 'fs';
import os from 'os';

const DB_PATH = process.env.DB_PATH || path.join(os.homedir(), '.aar', 'gateway.db');

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    try {
      // Ensure directory exists
      const dbDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      dbInstance = new Database(DB_PATH, {
        // Add timeout for busy operations to avoid blocking
        timeout: 5000,
      });
      
      // Enable WAL mode for better concurrency
      dbInstance.pragma('journal_mode = WAL');
      // Set busy timeout to handle concurrent access
      dbInstance.pragma('busy_timeout = 5000');
      
      // Initialize schema with error handling for concurrent access
      try {
        dbInstance.exec(CREATE_TABLES_SQL);
      } catch (schemaError: any) {
        // Ignore "table already exists" errors (concurrent initialization)
        if (!schemaError.message.includes('already exists') && 
            !schemaError.message.includes('duplicate')) {
          throw schemaError;
        }
      }
    } catch (error: any) {
      console.error('Database initialization error:', error);
      // Don't throw if it's a busy/locked error, retry might work
      if (error.message && error.message.includes('database is locked')) {
        // Wait a bit and retry once
        setTimeout(() => {
          if (!dbInstance) {
            try {
              dbInstance = new Database(DB_PATH, { timeout: 5000 });
              dbInstance.pragma('journal_mode = WAL');
              dbInstance.pragma('busy_timeout = 5000');
            } catch (retryError) {
              console.error('Database retry failed:', retryError);
            }
          }
        }, 100);
        // Return a temporary instance or throw
        throw new Error(`Database is temporarily locked: ${error.message}`);
      }
      throw new Error(`Failed to initialize database: ${error.message}`);
    }
  }
  
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function getDbPath(): string {
  return DB_PATH;
}
