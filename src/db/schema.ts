/**
 * Database schema definitions
 */

export interface Provider {
  id: number;
  name: string;
  protocol: 'openai' | 'anthropic' | 'gemini';
  base_url: string;
  api_key: string; // encrypted
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: number;
  provider_id: number;
  name: string;
  model_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RequestLog {
  id: number;
  model_id: number | null;
  request_method: string;
  request_path: string;
  request_headers: string; // JSON string
  request_query: string; // JSON string
  request_body: string; // JSON string
  response_status: number;
  response_body: string; // JSON string
  response_time_ms: number;
  created_at: string;
}

export interface Config {
  key: string;
  value: string; // JSON string
  updated_at: string;
}

export interface ServiceStatus {
  id: number;
  status: 'running' | 'stopped';
  port: number;
  pid: number | null;
  started_at: string | null;
  updated_at: string;
}

export const CREATE_TABLES_SQL = `
-- Providers table
CREATE TABLE IF NOT EXISTS providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK(protocol IN ('openai', 'anthropic', 'gemini')),
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Models table
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  model_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
  UNIQUE(provider_id, model_id)
);

-- Request logs table
CREATE TABLE IF NOT EXISTS request_logs (
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

-- Config table
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service status table
CREATE TABLE IF NOT EXISTS service_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL CHECK(status IN ('running', 'stopped')),
  port INTEGER NOT NULL,
  pid INTEGER,
  started_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_models_provider_id ON models(provider_id);
CREATE INDEX IF NOT EXISTS idx_models_enabled ON models(enabled);
CREATE INDEX IF NOT EXISTS idx_request_logs_model_id ON request_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
`;
