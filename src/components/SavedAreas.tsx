'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export default function SavedAreas({
  onSelectArea,
  currentSearchArea,
  isDark,
}: {
  onSelectArea: (geometry: any) => void
  currentSearchArea: any
  isDark: boolean
}) {
  const [savedAreas, setSavedAreas] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const user = auth.currentUser

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'savedAreas'), where('userId', '==', user.uid))
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const areas: any[] = []
        querySnapshot.forEach((doc) => {
          areas.push({ id: doc.id, ...doc.data() })
        })
        setSavedAreas(areas)
      })
      return () => unsubscribe()
    }
  }, [user])

  const handleDeleteConfirm = async (id: string) => {
    await deleteDoc(doc(db, 'savedAreas', id))
    setPendingDeleteId(null)
  }

  const handleSave = async () => {
    if (user && currentSearchArea) {
      const areaName = prompt('Enter a name for this area:')
      if (areaName) {
        await addDoc(collection(db, 'savedAreas'), {
          name: areaName,
          userId: user.uid,
          geometryJson: JSON.stringify(currentSearchArea),
          timestamp: new Date(),
        })
      }
    } else if (!currentSearchArea) {
      alert('Please draw an area on the map first.')
    }
  }

  const t = isDark
    ? {
        label: 'text-gray-400 hover:text-gray-200',
        emptyText: 'text-gray-500',
        item: 'text-gray-300 hover:text-white hover:bg-white/5',
        saveBtn: 'text-blue-400 hover:text-blue-300 border-blue-500/30 hover:border-blue-500/50',
        deleteBtn: 'text-gray-600 hover:text-red-400',
      }
    : {
        label: 'text-gray-500 hover:text-gray-800',
        emptyText: 'text-gray-400',
        item: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
        saveBtn: 'text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400',
        deleteBtn: 'text-gray-400 hover:text-red-500',
      }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider transition-colors py-1 ${t.label}`}
      >
        <span>Saved Areas</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1">
          {savedAreas.length === 0 && (
            <p className={`text-xs py-2 ${t.emptyText}`}>No saved areas yet.</p>
          )}
          {savedAreas.map((area) => (
            <div
              key={area.id}
              className={`group flex items-center gap-1 rounded-md transition-colors ${t.item}`}
            >
              {pendingDeleteId === area.id ? (
                <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5">
                  <span className={`text-xs flex-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Delete &ldquo;{area.name}&rdquo;?</span>
                  <button
                    onClick={() => handleDeleteConfirm(area.id)}
                    className="text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors px-1.5 py-0.5 rounded"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setPendingDeleteId(null)}
                    className={`text-[11px] font-medium transition-colors px-1.5 py-0.5 rounded ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const geo = area.geometryJson ? JSON.parse(area.geometryJson) : area.geometry
                      onSelectArea(geo)
                    }}
                    className="flex-1 text-left text-sm px-2.5 py-1.5 min-w-0 truncate"
                  >
                    {area.name}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPendingDeleteId(area.id) }}
                    className={`flex-shrink-0 w-6 h-6 mr-1 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all ${t.deleteBtn}`}
                    title="Delete area"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
          <button
            onClick={handleSave}
            className={`w-full mt-2 text-xs font-medium border rounded-lg px-3 py-2 transition-colors ${t.saveBtn}`}
          >
            + Save Current Area
          </button>
        </div>
      )}
    </div>
  )
}
