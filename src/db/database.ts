import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from './schema';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'gateway.db');

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    try {
      // Ensure directory exists
      const dbDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      dbInstance = new Database(DB_PATH);
      
      // Enable WAL mode for better concurrency
      dbInstance.pragma('journal_mode = WAL');
      
      // Initialize schema
      dbInstance.exec(CREATE_TABLES_SQL);
    } catch (error: any) {
      console.error('Database initialization error:', error);
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
