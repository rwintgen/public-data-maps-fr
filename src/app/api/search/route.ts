
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { geometry } = await req.json();

  // TODO: Validate geometry

  console.log("Received geometry:", geometry);

  // Mock data
  const companies = [
    {
      siren: '123456789',
      siret: '12345678901234',
      name: 'Mock Company 1',
      nafLabel: 'Mock Sector',
      address: '123 Mock Street, Mockville',
      lat: 48.8566,
      lon: 2.3522,
      isHeadOffice: true,
    },
    {
      siren: '987654321',
      siret: '98765432109876',
      name: 'Mock Company 2',
      nafLabel: 'Another Mock Sector',
      address: '456 Mock Avenue, Mocktown',
      lat: 48.86,
      lon: 2.36,
      isHeadOffice: true,
    },
    // Add more mock companies that are inside the drawn polygon
  ];

  return NextResponse.json({ companies });
}
