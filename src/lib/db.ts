import { Pool } from 'pg'
import { Connector } from '@google-cloud/cloud-sql-connector'

let pool: Pool | null = null

export async function getPool(): Promise<Pool> {
  if (pool) return pool

  const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME

  if (instanceConnectionName) {
    // Production: use Cloud SQL connector — no password, uses IAM service account
    const connector = new Connector()
    const clientOpts = await connector.getOptions({
      instanceConnectionName,
      ipType: 'PUBLIC',
    })
    pool = new Pool({
      ...clientOpts,
      user: process.env.DB_USER ?? 'postgres',
      database: process.env.DB_NAME ?? 'sirene_db',
      max: 5,
    })
  } else if (process.env.DATABASE_URL) {
    // Local dev: DATABASE_URL pointing to Cloud SQL Proxy on localhost:5432
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
      max: 5,
    })
  } else {
    throw new Error(
      'No database configuration found. Set DATABASE_URL (local) or CLOUD_SQL_CONNECTION_NAME (production).'
    )
  }

  // Verify connection on first use
  const client = await pool.connect()
  client.release()
  console.log('[db] Pool connected.')
  return pool
}

export function isDbConfigured(): boolean {
  return !!(process.env.DATABASE_URL || process.env.CLOUD_SQL_CONNECTION_NAME)
}
