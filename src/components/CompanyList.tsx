
'use client'

import { useState } from 'react'

export default function CompanyList({ companies, onCompanySelect }: { companies: any[], onCompanySelect: (company: any) => void }) {
  const [page, setPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(companies.length / itemsPerPage)

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const paginatedCompanies = companies.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  if (companies.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-2">Companies</h2>
        <p>No companies found in the selected area.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Companies</h2>
      <ul>
        {paginatedCompanies.map(company => (
          <li key={company.siret} onClick={() => onCompanySelect(company)} className="cursor-pointer hover:bg-gray-200 p-2 rounded">
            <p className="font-bold">{company.name}</p>
            <p>{company.address}</p>
            <p className="text-sm text-gray-600">{company.nafLabel}</p>
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <div className="flex justify-between mt-4">
          <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  )
}
