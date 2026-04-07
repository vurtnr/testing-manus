import postgres from 'postgres';
import { getEnv } from './env';

let _sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!_sql) {
    const env = getEnv();
    _sql = postgres(env.DATABASE_URL);
  }
  return _sql;
}

export async function closeDb() {
  if (_sql) {
    await _sql.end();
    _sql = null;
  }
}
