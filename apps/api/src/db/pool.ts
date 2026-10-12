import 'dotenv/config'
import { Pool } from 'pg'

export function createDatabasePool(databaseUrl = process.env.DATABASE_URL) {
  return databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
}
