'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Suggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  addresstype: string
}

interface Props {
  onSelect: (lat: number, lon: number, label: string) => void
  isDark: boolean
}

/**
 * Geocoding search bar backed by the Nominatim API.
 * Debounces input by 300 ms and supports keyboard navigation.
 */
export default function SearchBar({ onSelect, isDark }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1&countrycodes=fr`
      const res = await fetch(url, { headers: { 'Accept-Language': 'fr,en' } })
      const data: Suggestion[] = await res.json()
      setSuggestions(data)
      setIsOpen(data.length > 0)
      setActiveIndex(-1)
    } catch {
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchSuggestions])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (s: Suggestion) => {
    setQuery(s.display_name.split(',').slice(0, 2).join(','))
    setIsOpen(false)
    setSuggestions([])
    onSelect(parseFloat(s.lat), parseFloat(s.lon), s.display_name)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  /** Splits a Nominatim display_name into a short main label and a secondary line. */
  const parseName = (display_name: string) => {
    const parts = display_name.split(', ')
    return { main: parts.slice(0, 2).join(', '), sub: parts.slice(2, 4).join(', ') }
  }

  const t = isDark
    ? {
        wrapper: 'bg-white/5 border-white/10 focus-within:border-white/30 focus-within:bg-white/8',
        input: 'text-white placeholder-gray-500 bg-transparent',
        icon: 'text-gray-500',
        clearBtn: 'text-gray-500 hover:text-gray-300',
        dropdown: 'bg-gray-900 border-white/10',
        item: 'hover:bg-white/8 text-gray-200',
        itemActive: 'bg-white/10 text-white',
        itemSub: 'text-gray-500',
        spinner: 'border-gray-600 border-t-gray-300',
      }
    : {
        wrapper: 'bg-gray-50 border-gray-200 focus-within:border-blue-400 focus-within:bg-white',
        input: 'text-gray-900 placeholder-gray-400 bg-transparent',
        icon: 'text-gray-400',
        clearBtn: 'text-gray-400 hover:text-gray-600',
        dropdown: 'bg-white border-gray-200',
        item: 'hover:bg-gray-50 text-gray-700',
        itemActive: 'bg-blue-50 text-gray-900',
        itemSub: 'text-gray-400',
        spinner: 'border-gray-200 border-t-gray-500',
      }

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all ${t.wrapper}`}>
        {isLoading ? (
          <div className={`w-4 h-4 flex-shrink-0 rounded-full border-2 animate-spin ${t.spinner}`} />
        ) : (
          <svg className={`w-4 h-4 flex-shrink-0 ${t.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Search a place…"
          className={`flex-1 text-sm outline-none min-w-0 ${t.input}`}
        />
        {query && (
          <button onClick={handleClear} className={`flex-shrink-0 transition-colors ${t.clearBtn}`} data-tooltip="Clear search">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className={`absolute left-0 right-0 top-[calc(100%+4px)] z-[3000] rounded-xl border shadow-2xl overflow-hidden ${t.dropdown}`}>
          {suggestions.map((s, i) => {
            const { main, sub } = parseName(s.display_name)
            return (
              <button
                key={s.place_id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors ${i === activeIndex ? t.itemActive : t.item}`}
              >
                <svg className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${t.itemSub}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{main}</div>
                  {sub && <div className={`text-xs truncate mt-0.5 ${t.itemSub}`}>{sub}</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
