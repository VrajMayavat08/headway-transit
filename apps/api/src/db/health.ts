import type { Pool } from 'pg'

export type DatabaseHealth = { status: 'healthy' | 'unavailable' }

export async function checkDatabaseHealth(pool: Pool | null): Promise<DatabaseHealth> {
  if (!pool) return { status: 'unavailable' }

  try {
    await pool.query('SELECT 1')
    return { status: 'healthy' }
  } catch {
    return { status: 'unavailable' }
  }
}
