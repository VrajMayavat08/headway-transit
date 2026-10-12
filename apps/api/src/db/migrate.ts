import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PoolClient } from 'pg'
import { createDatabasePool } from './pool.js'

const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), '../../migrations')

async function applyMigration(client: PoolClient, name: string) {
  const sql = await readFile(join(migrationsDirectory, name), 'utf8')
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw new Error(`Migration ${name} failed`, { cause: error })
  }
}

const pool = createDatabasePool()
if (!pool) throw new Error('DATABASE_URL is required to run migrations')

try {
  const migrationNames = (await readdir(migrationsDirectory)).filter((name) => name.endsWith('.sql')).sort()
  if (migrationNames.length === 0) throw new Error('No SQL migrations found')

  const client = await pool.connect()
  try {
    let appliedNames: Set<string>
    try {
      const result = await client.query<{ name: string }>('SELECT name FROM schema_migrations ORDER BY name')
      appliedNames = new Set(result.rows.map((row) => row.name))
    } catch (error: unknown) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === '42P01')) throw error
      await applyMigration(client, migrationNames[0])
      appliedNames = new Set([migrationNames[0]])
    }

    for (const name of migrationNames) {
      if (appliedNames.has(name)) continue
      await applyMigration(client, name)
    }
  } finally {
    client.release()
  }
} finally {
  await pool.end()
}
