#!/usr/bin/env node
// Usage: DATABASE_URL=postgresql://... node scripts/import-sirene.js [path/to/file.csv]
//
// Streams the SIRENE CSV into PostgreSQL in batches of 1000 rows.
// Run this AFTER setup-db.sql has been applied.

'use strict'

const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse')
const { Pool } = require('pg')

const CSV_PATH = process.argv[2]
  ?? path.join(__dirname, '..', 'data', 'economicref-france-sirene-v3-sample.csv')

const GEO_COL = "Géolocalisation de l'établissement"
const BATCH_SIZE = 1000

if (!process.env.DATABASE_URL) {
  console.error('❌  Set DATABASE_URL before running this script.')
  console.error('    Example: DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/sirene_db node scripts/import-sirene.js')
  process.exit(1)
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌  CSV file not found: ${CSV_PATH}`)
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })

let total = 0
let skipped = 0
let batch = []

async function insertBatch(rows) {
  if (rows.length === 0) return

  // Build a multi-row INSERT
  const valuePlaceholders = []
  const params = []
  let i = 1

  for (const row of rows) {
    valuePlaceholders.push(`($${i}, $${i+1}, $${i+2}, ST_SetSRID(ST_MakePoint($${i+2}, $${i+1}), 4326), $${i+3})`)
    params.push(row.siret, row.lat, row.lon, JSON.stringify(row.fields))
    i += 4
  }

  const sql = `
    INSERT INTO establishments (siret, lat, lon, geom, fields)
    VALUES ${valuePlaceholders.join(', ')}
    ON CONFLICT (siret) DO UPDATE
      SET lat   = EXCLUDED.lat,
          lon   = EXCLUDED.lon,
          geom  = EXCLUDED.geom,
          fields = EXCLUDED.fields
  `

  await pool.query(sql, params)
}

async function run() {
  console.log(`📂  Reading: ${CSV_PATH}`)
  const client = await pool.connect()
  client.release()
  console.log('✅  Database connected.')

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(CSV_PATH, { encoding: 'utf-8' })
      .pipe(parse({ columns: true, skip_empty_lines: true, relax_quotes: true }))

    stream.on('data', async (row) => {
      const rawGeo = row[GEO_COL]
      if (!rawGeo || !rawGeo.trim()) { skipped++; return }

      const parts = rawGeo.split(',')
      if (parts.length < 2) { skipped++; return }

      const lat = parseFloat(parts[0].trim())
      const lon = parseFloat(parts[1].trim())
      if (!isFinite(lat) || !isFinite(lon)) { skipped++; return }

      // Strip the geo column from the stored fields (it's stored separately)
      const fields = { ...row }
      delete fields[GEO_COL]

      batch.push({ siret: row.SIRET ?? '', lat, lon, fields })

      if (batch.length >= BATCH_SIZE) {
        stream.pause()
        const currentBatch = batch.splice(0, BATCH_SIZE)
        try {
          await insertBatch(currentBatch)
          total += currentBatch.length
          process.stdout.write(`\r  Inserted ${total.toLocaleString()} rows...`)
        } catch (err) {
          console.error('\n❌  Insert error:', err.message)
          reject(err)
          return
        }
        stream.resume()
      }
    })

    stream.on('end', async () => {
      try {
        if (batch.length > 0) {
          await insertBatch(batch)
          total += batch.length
        }
        resolve()
      } catch (err) {
        reject(err)
      }
    })

    stream.on('error', reject)
  })

  console.log(`\n\n✅  Done. Inserted/updated ${total.toLocaleString()} rows. Skipped ${skipped.toLocaleString()} (missing coordinates).`)
  await pool.end()
}

run().catch((err) => {
  console.error('❌  Fatal error:', err)
  process.exit(1)
})
