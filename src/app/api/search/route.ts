
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

// Geo column name in the CSV
const GEO_COL = 'Géolocalisation de l\'établissement';

interface Company {
  lat: number;
  lon: number;
  fields: Record<string, string>;
}

// Cache parsed & projected companies and columns across requests
let companiesCache: Company[] | null = null;
let columnsCache: string[] | null = null;

function loadCompanies(): { companies: Company[]; columns: string[] } {
  if (companiesCache && columnsCache) return { companies: companiesCache, columns: columnsCache };

  const csvPath = path.join(process.cwd(), 'data', 'economicref-france-sirene-v3-sample.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true });

  // Extract column names from the first record
  if (records.length > 0) {
    columnsCache = Object.keys(records[0]);
  } else {
    columnsCache = [];
  }

  companiesCache = (records as any[])
    .filter((r) => r[GEO_COL] && r[GEO_COL].trim() !== '')
    .map((r) => {
      const parts = r[GEO_COL].split(',')
      if (parts.length < 2) return null;
      const lat = parseFloat(parts[0].trim());
      const lon = parseFloat(parts[1].trim());

      // Skip invalid coordinates
      if (!isFinite(lat) || !isFinite(lon)) return null;

      // Preserve all raw fields
      const fields: Record<string, string> = {};
      for (const key of columnsCache!) {
        fields[key] = r[key] ?? '';
      }

      return { lat, lon, fields };
    })
    .filter(Boolean) as Company[];

  console.log(`Loaded ${companiesCache.length} companies with ${columnsCache.length} columns from CSV.`);
  return { companies: companiesCache, columns: columnsCache };
}

// GET: return just column names (called on page load)
export async function GET() {
  try {
    const { columns } = loadCompanies();
    return NextResponse.json({ columns });
  } catch (error) {
    console.error('Columns API error:', error);
    return NextResponse.json(
      { error: 'Failed to read columns', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { geometry } = await req.json();

    if (!geometry) {
      return NextResponse.json({ companies: [] });
    }

    // Validate geometry
    if (!geometry.coordinates || !Array.isArray(geometry.coordinates)) {
      return NextResponse.json(
        { error: 'Invalid geometry: missing or invalid coordinates' },
        { status: 400 }
      );
    }

    const { companies: allCompanies, columns } = loadCompanies();

    const companies = allCompanies.filter((company) => {
      const pt = point([company.lon, company.lat]);
      return booleanPointInPolygon(pt, geometry);
    });

    console.log(`Found ${companies.length} companies in the drawn area.`);
    return NextResponse.json({ companies, columns });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search companies', details: String(error) },
      { status: 500 }
    );
  }
}
