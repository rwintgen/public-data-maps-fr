
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import CompanyList from '@/components/CompanyList'
import SavedAreas from '@/components/SavedAreas'
import { auth } from '@/lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

export default function Home() {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [searchArea, setSearchArea] = useState(null)
  const [user] = useAuthState(auth)

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

  const signIn = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const handleSignOut = async () => {
    await signOut(auth)
  }

  return (
    <main className="flex h-screen">
      <div className="w-2/3 h-full relative">
        <div className="bg-red-500 w-full h-full">Is this red box visible?</div>
      </div>
      <div className="w-1/3 overflow-y-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Sirene Area Companies</h1>

        {user ? (
          <div>
            <p>Welcome, {user.displayName}</p>
            <button onClick={handleSignOut} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mb-4">
              Sign Out
            </button>
            <div className="mb-4">
              <SavedAreas onSelectArea={handleSearch} currentSearchArea={searchArea} />
            </div>
          </div>
        ) : (
          <button onClick={signIn} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4">
            Sign In with Google to Save Areas
          </button>
        )}

        <CompanyList companies={companies} onCompanySelect={setSelectedCompany} />
      </div>
    </main>
  )
}
