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
        
        // Migration: Allow NULL model_id in request_logs table (for gateway requests)
        // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
        try {
          // Check if request_logs table exists and has NOT NULL constraint
          const tableInfo = dbInstance.prepare("PRAGMA table_info(request_logs)").all() as any[];
          const modelIdColumn = tableInfo.find(col => col.name === 'model_id');
          
          if (modelIdColumn && modelIdColumn.notnull === 1) {
            // Table exists with NOT NULL constraint, need to migrate
            console.log('[Database] Migrating request_logs table to allow NULL model_id...');
            
            // Create new table with NULL allowed
            dbInstance.exec(`
              CREATE TABLE IF NOT EXISTS request_logs_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_id INTEGER,
                request_method TEXT NOT NULL,
                request_path TEXT NOT NULL,
                request_headers TEXT,
                request_query TEXT,
                request_body TEXT,
                response_status INTEGER,
                response_body TEXT,
                response_time_ms INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE SET NULL
              );
              
              -- Copy data from old table
              INSERT INTO request_logs_new 
              SELECT * FROM request_logs;
              
              -- Drop old table
              DROP TABLE request_logs;
              
              -- Rename new table
              ALTER TABLE request_logs_new RENAME TO request_logs;
            `);
            
            console.log('[Database] Migration completed successfully');
          }
        } catch (migrationError: any) {
          // Migration errors are not critical, just log them
          // The table might already be migrated or in use
          if (!migrationError.message.includes('no such table') && 
              !migrationError.message.includes('already exists')) {
            console.warn('[Database] Migration warning (non-critical):', migrationError.message);
          }
        }
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
