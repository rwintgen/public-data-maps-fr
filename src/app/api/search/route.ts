
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import proj4 from 'proj4';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

// Lambert 93 (EPSG:2154) projection definition
proj4.defs(
  'EPSG:2154',
  '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

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

  const csvPath = path.join(process.cwd(), 'data', 'sample.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true });

  // Extract column names from the first record
  if (records.length > 0) {
    columnsCache = Object.keys(records[0]);
  } else {
    columnsCache = [];
  }

  companiesCache = (records as any[])
    .filter(
      (r) =>
        r.coordonneeLambertAbscisseEtablissement &&
        r.coordonneeLambertOrdonneeEtablissement
    )
    .map((r) => {
      const x = parseFloat(r.coordonneeLambertAbscisseEtablissement);
      const y = parseFloat(r.coordonneeLambertOrdonneeEtablissement);
      
      // Skip invalid coordinates
      if (!isFinite(x) || !isFinite(y)) {
        return null;
      }
      
      const [lon, lat] = proj4('EPSG:2154', 'WGS84', [x, y]);

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
