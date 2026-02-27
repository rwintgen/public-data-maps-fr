#!/usr/bin/env node
// Usage: DATABASE_URL=postgresql://... node scripts/import-sirene.js [path/to/file.csv]
//
// Streams the SIRENE CSV into PostgreSQL via the COPY protocol.
// Run this AFTER setup-db.sql has been applied.
// Progress is saved to .import-checkpoint (byte offset) so interrupted runs resume.

'use strict'

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { parse } = require('csv-parse')
const { Client } = require('pg')
const copyFrom = require('pg-copy-streams').from

const CSV_PATH = process.argv[2]
  ?? path.join(__dirname, '..', 'data', 'economicref-france-sirene-v3-sample.csv')

const GEO_COL = "G\u00e9olocalisation de l'\u00e9tablissement"
const BATCH_SIZE = 10000
const CHECKPOINT_FILE = path.join(__dirname, '..', '.import-checkpoint')

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL before running this script.')
  process.exit(1)
}
if (!fs.existsSync(CSV_PATH)) {
  console.error('CSV file not found:', CSV_PATH)
  process.exit(1)
}

function readHeader() {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(CSV_PATH, { encoding: 'utf-8' }),
    })
    rl.once('line', (line) => { rl.close(); resolve(line.split(';')) })
    rl.once('error', reject)
  })
}

function copyEscape(val) {
  if (val === null || val === undefined || val === '') return '\\N'
  return String(val)
    .replace(/\\/g, '\\\\')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

async function run() {
  console.log('Reading:', CSV_PATH)

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: false })
  await client.connect()
  console.log('Database connected.')

  const columns = await readHeader()

  let fromByte = 0
  if (fs.existsSync(CHECKPOINT_FILE)) {
    fromByte = parseInt(fs.readFileSync(CHECKPOINT_FILE, 'utf-8').trim(), 10) || 0
    if (fromByte > 0) console.log('Resuming from byte ' + fromByte.toLocaleString() + '...')
  }

  await client.query('SET synchronous_commit = off')
  await client.query("SET work_mem = '256MB'")

  console.log('Preparing table for bulk insert...')
  await client.query('ALTER TABLE establishments ALTER COLUMN geom DROP NOT NULL')
  await client.query('DROP INDEX IF EXISTS idx_establishments_geom')
  await client.query('DROP INDEX IF EXISTS idx_establishments_fields')
  await client.query('ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_siret_key')
  await client.query('DROP INDEX IF EXISTS idx_establishments_siret')
  console.log('All indexes/constraints dropped.')

  const csvParser = fs.createReadStream(CSV_PATH, { start: fromByte })
    .pipe(parse({
      columns,
      skip_empty_lines: true,
      relax_quotes: true,
      delimiter: ';',
      skip_records_with_error: true,
      info: true,
    }))

  let total = 0
  let skipped = 0
  let batch = []
  let lastBytes = 0
  const startTime = Date.now()

  async function flushBatch() {
    if (batch.length === 0) return

    let payload = ''
    for (const r of batch) {
      payload += copyEscape(r.siret) + '\t'
        + r.lat + '\t'
        + r.lon + '\t'
        + copyEscape(JSON.stringify(r.fields)) + '\n'
    }

    await new Promise((resolve, reject) => {
      const stream = client.query(copyFrom(
        'COPY establishments (siret, lat, lon, fields) FROM STDIN'
      ))
      stream.on('error', reject)
      stream.on('finish', resolve)
      stream.write(payload)
      stream.end()
    })

    total += batch.length
    batch = []

    fs.writeFileSync(CHECKPOINT_FILE, String(fromByte + lastBytes))
    const elapsed = (Date.now() - startTime) / 1000
    const rate = Math.round(total / elapsed)
    console.log('  ' + total.toLocaleString() + ' rows  |  ' + rate.toLocaleString() + ' rows/s')
  }

  for await (const { record: row, info } of csvParser) {
    lastBytes = info.bytes

    const rawGeo = row[GEO_COL]
    if (!rawGeo || !rawGeo.trim()) { skipped++; continue }

    const parts = rawGeo.split(',')
    if (parts.length < 2) { skipped++; continue }

    const lat = parseFloat(parts[0].trim())
    const lon = parseFloat(parts[1].trim())
    if (!isFinite(lat) || !isFinite(lon)) { skipped++; continue }

    const fields = { ...row }
    delete fields[GEO_COL]

    batch.push({ siret: row.SIRET ?? '', lat, lon, fields })

    if (batch.length >= BATCH_SIZE) {
      await flushBatch()
    }
  }
  await flushBatch()

  console.log('\nInserts done: ' + total.toLocaleString() + ' rows, ' + skipped.toLocaleString() + ' skipped.')

  console.log('Deduplicating rows...')
  const { rowCount } = await client.query(
    'DELETE FROM establishments a USING establishments b WHERE a.id < b.id AND a.siret = b.siret'
  )
  console.log('Removed ' + (rowCount ?? 0).toLocaleString() + ' duplicates.')

  console.log('Computing geometries...')
  await client.query(
    'UPDATE establishments SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326) WHERE geom IS NULL'
  )
  await client.query('ALTER TABLE establishments ALTER COLUMN geom SET NOT NULL')
  console.log('Geometries computed.')

  console.log('Recreating constraints and indexes (may take a few minutes)...')
  await client.query('ALTER TABLE establishments ADD CONSTRAINT establishments_siret_key UNIQUE (siret)')
  await client.query('CREATE INDEX IF NOT EXISTS idx_establishments_siret ON establishments (siret)')
  await client.query('CREATE INDEX IF NOT EXISTS idx_establishments_geom ON establishments USING GIST (geom)')
  await client.query('CREATE INDEX IF NOT EXISTS idx_establishments_fields ON establishments USING GIN (fields jsonb_path_ops)')
  console.log('All indexes and constraints created.')

  if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE)
  console.log('All done!')

  await client.end()
}

run().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
