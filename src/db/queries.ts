import { getDatabase } from './database';
import type { Provider, Model, RequestLog, Config } from './schema';

// Provider queries
export function getAllProviders(): Provider[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM providers ORDER BY created_at DESC').all() as Provider[];
}

export function getProviderById(id: number): Provider | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as Provider | null;
}

export function createProvider(provider: Omit<Provider, 'id' | 'created_at' | 'updated_at'>): Provider {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO providers (name, protocol, base_url, api_key, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);
  const result = stmt.run(provider.name, provider.protocol, provider.base_url, provider.api_key);
  return getProviderById(result.lastInsertRowid as number)!;
}

export function updateProvider(id: number, provider: Partial<Omit<Provider, 'id' | 'created_at'>>): Provider | null {
  const db = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (provider.name !== undefined) {
    updates.push('name = ?');
    values.push(provider.name);
  }
  if (provider.protocol !== undefined) {
    updates.push('protocol = ?');
    values.push(provider.protocol);
  }
  if (provider.base_url !== undefined) {
    updates.push('base_url = ?');
    values.push(provider.base_url);
  }
  if (provider.api_key !== undefined) {
    updates.push('api_key = ?');
    values.push(provider.api_key);
  }

  if (updates.length === 0) {
    return getProviderById(id);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = db.prepare(`UPDATE providers SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getProviderById(id);
}

export function deleteProvider(id: number): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM providers WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Model queries
export function getAllModels(): Model[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT m.*, p.name as provider_name, p.protocol as provider_protocol
    FROM models m
    JOIN providers p ON m.provider_id = p.id
    ORDER BY m.created_at DESC
  `).all() as any[];
}

export function getModelsByProvider(providerId: number): Model[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM models WHERE provider_id = ? ORDER BY name').all(providerId) as Model[];
}

export function getModelById(id: number): Model | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM models WHERE id = ?').get(id) as Model | null;
}

export function getModelByModelId(providerId: number, modelId: string): Model | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM models WHERE provider_id = ? AND model_id = ?').get(providerId, modelId) as Model | null;
}

export function createModel(model: Omit<Model, 'id' | 'created_at' | 'updated_at'>): Model {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO models (provider_id, name, model_id, enabled, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);
  const result = stmt.run(model.provider_id, model.name, model.model_id, model.enabled ? 1 : 0);
  return getModelById(result.lastInsertRowid as number)!;
}

export function updateModel(id: number, model: Partial<Omit<Model, 'id' | 'created_at'>>): Model | null {
  const db = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (model.name !== undefined) {
    updates.push('name = ?');
    values.push(model.name);
  }
  if (model.model_id !== undefined) {
    updates.push('model_id = ?');
    values.push(model.model_id);
  }
  if (model.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(model.enabled ? 1 : 0);
  }
  if (model.provider_id !== undefined) {
    updates.push('provider_id = ?');
    values.push(model.provider_id);
  }

  if (updates.length === 0) {
    return getModelById(id);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = db.prepare(`UPDATE models SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getModelById(id);
}

export function deleteModel(id: number): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM models WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getEnabledModels(): Model[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT m.*, p.name as provider_name, p.protocol, p.base_url, p.api_key
    FROM models m
    JOIN providers p ON m.provider_id = p.id
    WHERE m.enabled = 1
    ORDER BY m.name
  `).all() as any[];
}

// Request log queries
export function createRequestLog(log: Omit<RequestLog, 'id' | 'created_at'>): RequestLog {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO request_logs (
      model_id, request_method, request_path, request_headers,
      request_query, request_body, response_status, response_body, response_time_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    log.model_id,
    log.request_method,
    log.request_path,
    log.request_headers,
    log.request_query,
    log.request_body,
    log.response_status,
    log.response_body,
    log.response_time_ms
  );
  return db.prepare('SELECT * FROM request_logs WHERE id = ?').get(result.lastInsertRowid) as RequestLog;
}

export function getRequestLogs(limit: number = 100, offset: number = 0, modelId?: number): RequestLog[] {
  const db = getDatabase();
  if (modelId) {
    return db.prepare(`
      SELECT l.*, m.name as model_name, m.model_id, p.name as provider_name
      FROM request_logs l
      LEFT JOIN models m ON l.model_id = m.id
      LEFT JOIN providers p ON m.provider_id = p.id
      WHERE l.model_id = ?
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `).all(modelId, limit, offset) as any[];
  }
  return db.prepare(`
    SELECT l.*, m.name as model_name, m.model_id, p.name as provider_name
    FROM request_logs l
    LEFT JOIN models m ON l.model_id = m.id
    LEFT JOIN providers p ON m.provider_id = p.id
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as any[];
}

export function getRequestLogById(id: number): RequestLog | null {
  const db = getDatabase();
  return db.prepare(`
    SELECT l.*, m.name as model_name, m.model_id, p.name as provider_name
    FROM request_logs l
    LEFT JOIN models m ON l.model_id = m.id
    LEFT JOIN providers p ON m.provider_id = p.id
    WHERE l.id = ?
  `).get(id) as any | null;
}

export function getRequestLogCount(modelId?: number): number {
  const db = getDatabase();
  if (modelId) {
    return (db.prepare('SELECT COUNT(*) as count FROM request_logs WHERE model_id = ?').get(modelId) as any).count;
  }
  return (db.prepare('SELECT COUNT(*) as count FROM request_logs').get() as any).count;
}

// Config queries
export function getConfig(key: string): Config | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM config WHERE key = ?').get(key) as Config | null;
}

export function setConfig(key: string, value: string): Config {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO config (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now')
  `);
  stmt.run(key, value);
  return getConfig(key)!;
}

export function getAllConfig(): Record<string, string> {
  const db = getDatabase();
  const configs = db.prepare('SELECT key, value FROM config').all() as Config[];
  const result: Record<string, string> = {};
  for (const config of configs) {
    result[config.key] = config.value;
  }
  return result;
}
