'use client'

import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

interface Filter {
  column: string
  operator: 'contains' | 'equals' | 'empty'
  negate: boolean
  value: string
}


/**
 * Collapsible panel listing saved searches from Firestore.
 * Supports save (inline name input), rename, delete, and restore —
 * restoring re-applies the geometry, filters, and sort to the main view.
 */
export default function SavedAreas({
  onRestoreSearch,
  currentSearchArea,
  currentFilters,
  currentSortBy,
  currentSortDir,
  currentActivePresets,
  onDeleteCurrentSearch,
  activeSearchId,
  isDark,
}: {
  onRestoreSearch: (geometry: any, filters: Filter[], sortBy: string | null, sortDir: 'asc' | 'desc', activePresets: string[], id: string) => void
  currentSearchArea: any
  currentFilters: Filter[]
  currentSortBy: string | null
  currentSortDir: 'asc' | 'desc'
  currentActivePresets: string[]
  onDeleteCurrentSearch: () => void
  activeSearchId: string | null
  isDark: boolean
}) {
  const [savedAreas, setSavedAreas] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const saveInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
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

  const handleDeleteConfirm = async (area: any) => {
    if (area.id === activeSearchId) {
      onDeleteCurrentSearch()
    }
    await deleteDoc(doc(db, 'savedAreas', area.id))
    setPendingDeleteId(null)
  }

  const handleSave = async () => {
    if (!currentSearchArea) return
    if (!isSaving) {
      setIsSaving(true)
      setSaveName('')
      setTimeout(() => saveInputRef.current?.focus(), 50)
      return
    }
    if (user && saveName.trim()) {
      await addDoc(collection(db, 'savedAreas'), {
        name: saveName.trim(),
        userId: user.uid,
        geometryJson: JSON.stringify(currentSearchArea),
        filtersJson: JSON.stringify(currentFilters),
        sortBy: currentSortBy ?? null,
        sortDir: currentSortDir,
        presetsJson: JSON.stringify(currentActivePresets),
        timestamp: new Date(),
      })
      setIsSaving(false)
      setSaveName('')
    }
  }

  const handleRename = async (areaId: string) => {
    if (renameValue.trim()) {
      await updateDoc(doc(db, 'savedAreas', areaId), { name: renameValue.trim() })
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const t = isDark
    ? {
        label: 'text-gray-400 hover:text-gray-200',
        emptyText: 'text-gray-500',
        item: 'text-gray-300 hover:text-white hover:bg-white/5',
        saveBtn: 'text-gray-300 hover:text-white border-white/15 hover:border-white/30',
        deleteBtn: 'text-gray-600 hover:text-red-400',
      }
    : {
        label: 'text-gray-500 hover:text-gray-800',
        emptyText: 'text-gray-400',
        item: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
        saveBtn: 'text-violet-600 hover:text-violet-700 border-violet-300 hover:border-violet-400',
        deleteBtn: 'text-gray-400 hover:text-red-500',
      }

  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${t.label}`}
        >
          <span>Saved Searches</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="relative group/info">
          <svg
            className={`w-3.5 h-3.5 cursor-default ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className={`pointer-events-none absolute right-0 bottom-full mb-2 w-52 rounded-lg border px-3 py-2 text-[11px] leading-relaxed shadow-xl opacity-0 group-hover/info:opacity-100 transition-opacity z-50 ${
            isDark ? 'bg-gray-800 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-600'
          }`}>
            Saves the current map area along with any active filters and sort settings, so you can restore the exact same search later.
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="mt-2 space-y-1">
          {savedAreas.length === 0 && (
            <p className={`text-xs py-2 ${t.emptyText}`}>No saved searches yet.</p>
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
                    onClick={() => handleDeleteConfirm(area)}
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
              ) : renamingId === area.id ? (
                <div className="flex-1 flex items-center gap-1 px-2 py-1">
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(area.id); if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') } }}
                    className={`flex-1 min-w-0 text-sm rounded px-1.5 py-0.5 outline-none border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    autoFocus
                  />
                  <button
                    onClick={() => handleRename(area.id)}
                    className={`text-[11px] font-semibold transition-colors px-1 py-0.5 rounded ${isDark ? 'text-gray-300 hover:text-white' : 'text-violet-500 hover:text-violet-400'}`}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setRenamingId(null); setRenameValue('') }}
                    className={`text-[11px] font-medium transition-colors px-1 py-0.5 rounded ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const geo = area.geometryJson ? JSON.parse(area.geometryJson) : area.geometry
                      const filters: Filter[] = area.filtersJson ? JSON.parse(area.filtersJson) : []
                      const sortBy: string | null = area.sortBy ?? null
                      const sortDir: 'asc' | 'desc' = area.sortDir ?? 'asc'
                      const activePresets: string[] = area.presetsJson ? JSON.parse(area.presetsJson) : []
                      onRestoreSearch(geo, filters, sortBy, sortDir, activePresets, area.id)
                    }}
                    className="flex-1 text-left text-sm px-2.5 py-1.5 min-w-0 truncate"
                  >
                    {area.name}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setRenamingId(area.id); setRenameValue(area.name) ; setTimeout(() => renameInputRef.current?.focus(), 50) }}
                    className={`flex-shrink-0 w-6 h-6 mr-0.5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-violet-600'}`}
                    data-tooltip="Rename search"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPendingDeleteId(area.id) }}
                    className={`flex-shrink-0 w-6 h-6 mr-1 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all ${t.deleteBtn}`}
                    data-tooltip="Delete search"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
          {isSaving ? (
            <div className={`mt-2 flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 ${isDark ? 'border-white/15 bg-white/5' : 'border-violet-300 bg-gray-50'}`}>
              <input
                ref={saveInputRef}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setIsSaving(false); setSaveName('') } }}
                placeholder="Search name…"
                className={`flex-1 min-w-0 text-xs bg-transparent outline-none ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
              />
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className={`text-[11px] font-semibold transition-colors px-1.5 py-0.5 rounded ${saveName.trim() ? (isDark ? 'text-gray-300 hover:text-white' : 'text-violet-500 hover:text-violet-400') : isDark ? 'text-gray-600' : 'text-gray-400'}`}
              >
                Save
              </button>
              <button
                onClick={() => { setIsSaving(false); setSaveName('') }}
                className={`text-[11px] font-medium transition-colors px-1 py-0.5 rounded ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleSave}
              className={`w-full mt-2 text-xs font-medium border rounded-lg px-3 py-2 transition-colors ${t.saveBtn} ${!currentSearchArea ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              + Save Current Search
            </button>
          )}
        </div>
      )}
    </div>
  )
}
