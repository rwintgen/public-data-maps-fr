
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import CompanyList from '@/components/CompanyList'
import SavedAreas from '@/components/SavedAreas'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

export default function Home() {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [searchArea, setSearchArea] = useState(null)

  const handleSearch = async (geometry: any) => {
    if (!geometry) {
      setCompanies([]);
      setSearchArea(null);
      return;
    }
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ geometry }),
    })
    const data = await response.json()
    setCompanies(data.companies)
    setSearchArea(geometry)
  }

  return (
    <main className="flex h-screen">
      <div className="w-2/3">
        <Map companies={companies} selectedCompany={selectedCompany} onSearch={handleSearch} />
      </div>
      <div className="w-1/3 overflow-y-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Sirene Area Companies</h1>
        <div className="mb-4">
            <SavedAreas onSelectArea={handleSearch} currentSearchArea={searchArea} />
        </div>
        <CompanyList companies={companies} onCompanySelect={setSelectedCompany} />
      </div>
    </main>
  )
}
