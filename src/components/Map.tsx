'use client'

import { MapContainer, TileLayer, FeatureGroup, useMap, Marker, Popup } from 'react-leaflet'
import { EditControl } from 'react-leaflet-draw'
import { useRef, useEffect, useCallback, useMemo } from 'react'

import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'

const FRANCE_CENTER: [number, number] = [46.603354, 1.888334]
const FRANCE_ZOOM = 6
delete (L.Icon.Default.prototype as any)._getIconUrl;

const defaultIcon = new L.Icon({
  iconUrl: '/app/map-pin.png',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -16],
});

const selectedIcon = new L.Icon({
  iconUrl: '/app/map-pin.png',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -22],
});

/**
 * Creates a custom DivIcon for cluster markers.
 * The outer div (className="cluster-wrap") overrides Leaflet's leaflet-div-icon
 * defaults. The inner div carries all visual styling so flex centering is reliable.
 */
function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount()
  const display = count >= 1000 ? Math.round(count / 1000) + 'k' : String(count)
  let size = 32
  let sizeClass = 'ci-sm'
  if (count >= 1000) { size = 44; sizeClass = 'ci-lg' }
  else if (count >= 100) { size = 40; sizeClass = 'ci-md' }
  else if (count >= 10) { size = 36; sizeClass = 'ci-sm' }
  return L.divIcon({
    html: `<div class="ci ${sizeClass}">${display}</div>`,
    className: 'cluster-wrap',
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  })
}

/**
 * Uses the native leaflet.markercluster API instead of React Marker components.
 * This eliminates React overhead for large datasets (50k+) and ensures cluster
 * counts reflect the real total.
 */
function ClusteredMarkers({
  companies,
  onCompanySelect,
  onExpand,
  popupColumns,
  recentMarkerClickRef,
}: {
  companies: any[]
  onCompanySelect: (company: any) => void
  onExpand: (company: any) => void
  popupColumns: string[]
  recentMarkerClickRef: React.MutableRefObject<boolean>
}) {
  const map = useMap()
  const groupRef = useRef<L.MarkerClusterGroup | null>(null)
  const selectRef = useRef(onCompanySelect)
  const expandRef = useRef(onExpand)
  selectRef.current = onCompanySelect
  expandRef.current = onExpand

  useEffect(() => {
    const g = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: createClusterIcon,
    })
    groupRef.current = g
    map.addLayer(g)

    const onPopupOpen = (e: any) => {
      const btn = e.popup?.getElement()?.querySelector('.marker-expand-btn') as HTMLElement | null
      if (!btn) return
      const marker = e.popup._source
      if (marker?._company) {
        btn.onclick = () => expandRef.current(marker._company)
      }
    }
    map.on('popupopen', onPopupOpen)

    return () => {
      map.off('popupopen', onPopupOpen)
      map.removeLayer(g)
    }
  }, [map])

  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.clearLayers()

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const markers = companies.map((c: any) => {
      const m = L.marker([c.lat, c.lon], { icon: defaultIcon })
      ;(m as any)._company = c
      m.on('click', () => {
        recentMarkerClickRef.current = true
        setTimeout(() => { recentMarkerClickRef.current = false }, 100)
        selectRef.current(c)
      })

      let html = '<div class="min-w-[160px]">'
      if (popupColumns.length === 0) {
        html += '<p class="text-xs italic text-gray-400">No columns selected</p>'
      } else {
        popupColumns.forEach((col, i) => {
          const val = esc(String(c.fields?.[col] ?? ''))
          if (i === 0) html += `<p class="font-semibold text-sm leading-tight">${val || '\u2014'}</p>`
          else html += `<p class="text-xs text-gray-400 mt-0.5">${esc(col)}: ${val}</p>`
        })
      }
      html += '<button class="marker-expand-btn mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg py-2.5 transition-colors">View details <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></button>'
      html += '</div>'
      m.bindPopup(html)
      return m
    })
    g.addLayers(markers)
  }, [companies, popupColumns])

  return null
}

/** Renders and auto-zooms a larger marker with a popup for the selected company. */
function SelectedMarkerPopup({ selectedCompany, popupColumns, onExpand, onDeselect }: { selectedCompany: any; popupColumns: string[]; onExpand: (company: any) => void; onDeselect: () => void }) {
  const map = useMap()
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (selectedCompany && markerRef.current) {
      map.setView([selectedCompany.lat, selectedCompany.lon], Math.max(map.getZoom(), 13), { animate: true })
      setTimeout(() => {
        markerRef.current?.openPopup()
      }, 300)
    }
  }, [selectedCompany, map])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker || !selectedCompany) return
    const handleClose = () => onDeselect()
    marker.on('popupclose', handleClose)
    return () => { marker.off('popupclose', handleClose) }
  }, [selectedCompany, onDeselect])

  if (!selectedCompany) return null

  return (
    <Marker
      ref={markerRef}
      position={[selectedCompany.lat, selectedCompany.lon]}
      icon={selectedIcon}
      zIndexOffset={1000}
    >
      <Popup>
        <div className="min-w-[180px]">
          {popupColumns.length === 0 ? (
            <p className="text-xs italic text-gray-400">No columns selected</p>
          ) : (
            popupColumns.map((col, i) => {
              const val = selectedCompany.fields?.[col] ?? ''
              if (i === 0) return <p key={col} className="font-semibold text-sm leading-tight">{val || '—'}</p>
              return <p key={col} className="text-xs text-gray-400 mt-0.5">{col}: {val}</p>
            })
          )}
                <button
                  onClick={() => onExpand(selectedCompany)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg py-2.5 transition-colors"
                >
                  View details
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
        </div>
      </Popup>
    </Marker>
  )
}

/** Flies the map to the user's GPS coordinates when they change. */
function LocationUpdater({ userLocation }: { userLocation: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, Math.max(map.getZoom(), 12), { animate: true, duration: 1.2 })
    }
  }, [userLocation, map])
  return null
}

/** Captures the Leaflet map instance into a mutable ref for imperative access. */
function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  mapRef.current = useMap()
  return null
}

/** Invalidates the Leaflet map size when the container resizes (e.g. sidebar collapse). */
function ResizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(container)
    return () => ro.disconnect()
  }, [map])
  return null
}

/**
 * Clears the selected company when the user clicks the map background.
 * Uses `recentMarkerClickRef` to avoid deselecting when clicking a new marker.
 */
function MapDeselectHandler({ onCompanySelectRef, recentMarkerClickRef }: {
  onCompanySelectRef: React.MutableRefObject<(c: any) => void>
  recentMarkerClickRef: React.MutableRefObject<boolean>
}) {
  const map = useMap()
  useEffect(() => {
    const deselect = () => {
      if (recentMarkerClickRef.current) return
      onCompanySelectRef.current(null)
    }
    map.on('click', deselect)
    return () => { map.off('click', deselect) }
  }, [map, onCompanySelectRef, recentMarkerClickRef])
  return null
}

/**
 * Main Leaflet map with polygon/rectangle draw tools.
 * Renders company markers, handles draw-create/edit/delete events,
 * and supports restoring saved search geometries.
 */
export default function Map({
  companies,
  selectedCompany,
  onSearch,
  onCompanySelect,
  onExpand,
  onLocate,
  isDark,
  mapStyle,
  userLocation,
  popupColumns,
  restoreGeometry,
  sidebarOpen,
  onToggleSidebar,
}: {
  companies: any[]
  selectedCompany: any
  onSearch: (geometry: any) => void
  onCompanySelect: (company: any) => void
  onExpand: (company: any) => void
  onLocate: () => void
  isDark: boolean
  mapStyle: 'default' | 'themed' | 'satellite'
  userLocation: [number, number] | null
  popupColumns: string[]
  restoreGeometry: { geometry: any; ts: number } | null
  sidebarOpen: boolean
  onToggleSidebar: () => void
}) {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const onSearchRef = useRef(onSearch)
  const onCompanySelectRef = useRef(onCompanySelect)
  const recentMarkerClickRef = useRef(false)
  onSearchRef.current = onSearch
  onCompanySelectRef.current = onCompanySelect

  /**
   * Replaces native `title` with `data-tooltip` on Leaflet control buttons.
   * Uses lazy migration on hover (mouseover) instead of a MutationObserver
   * to avoid interfering with Leaflet Draw's click-handler DOM mutations.
   */
  useEffect(() => {
    const migrate = (root: Element | Document = document) => {
      root.querySelectorAll<HTMLElement>('.leaflet-bar a[title], .leaflet-draw-toolbar a[title]').forEach((el) => {
        const t = el.getAttribute('title')
        if (t) {
          el.setAttribute('data-tooltip', t)
          el.setAttribute('title', '')
        }
      })
    }
    const timers = [200, 600, 1500].map(ms => setTimeout(migrate, ms))
    const onHover = (e: Event) => {
      const target = e.target as HTMLElement
      const el = target.closest?.('.leaflet-bar a[title], .leaflet-draw-toolbar a[title]') as HTMLElement | null
      if (el) {
        const t = el.getAttribute('title')
        if (t) {
          el.setAttribute('data-tooltip', t)
          el.setAttribute('title', '')
        }
      }
    }
    document.addEventListener('mouseover', onHover)
    return () => { timers.forEach(clearTimeout); document.removeEventListener('mouseover', onHover) }
  }, [])

  /**
   * Restore a saved search geometry onto the map.
   * Clears previous drawings, adds the GeoJSON polygon, and fits the view.
   * The `ts` timestamp in `restoreGeometry` ensures re-triggers for the same geometry.
   */
  useEffect(() => {
    if (!restoreGeometry || !featureGroupRef.current || !mapInstanceRef.current) return
    featureGroupRef.current.clearLayers()
    const feature = { type: 'Feature', geometry: restoreGeometry.geometry, properties: {} }
    const geoLayer = L.geoJSON(feature as any, {
      style: { color: '#8b5cf6', weight: 2, fillOpacity: 0.15 },
    })
    geoLayer.eachLayer((l: any) => featureGroupRef.current?.addLayer(l))
    const bounds = featureGroupRef.current.getBounds()
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [restoreGeometry])

  /** Keeps only the newest drawing layer and triggers a search with its geometry. */
  const onCreated = useCallback((e: any) => {
    if (featureGroupRef.current) {
      featureGroupRef.current.eachLayer((layer: any) => {
        if (layer !== e.layer) {
          featureGroupRef.current?.removeLayer(layer)
        }
      })
    }
    const geo = e.layer.toGeoJSON().geometry
    onSearchRef.current(geo)
  }, [])

  const onEdited = useCallback((e: any) => {
    const layers = e.layers
    let lastGeometry: any = null
    layers.eachLayer((layer: any) => {
      lastGeometry = layer.toGeoJSON().geometry
    })
    if (lastGeometry) {
      onSearchRef.current(lastGeometry)
    }
  }, [])

  const onDeleted = useCallback(() => {
    onSearchRef.current(null)
  }, [])

  const handleDeselect = useCallback(() => {
    onCompanySelectRef.current(null)
  }, [])

  const drawConfig = useMemo(() => ({
    polygon: {
      shapeOptions: { color: '#8b5cf6', weight: 2, fillOpacity: 0.15 },
      allowIntersection: false,
      showArea: true,
    },
    rectangle: {
      shapeOptions: { color: '#8b5cf6', weight: 2, fillOpacity: 0.15 },
    },
    circle: false as const,
    circlemarker: false as const,
    marker: false as const,
    polyline: false as const,
  }), [])

  const editConfig = useMemo(() => ({
    edit: {
      selectedPathOptions: { color: '#a78bfa', fillOpacity: 0.25 },
    } as any,
  }), [])

  return (
    <div className="w-full h-full relative" data-mapstyle={mapStyle}>
      <MapContainer
        center={FRANCE_CENTER}
        zoom={FRANCE_ZOOM}
      scrollWheelZoom={true}
      className="absolute inset-0 z-0"
    >
      <TileLayer
        key={`${mapStyle}-${isDark}`}
        attribution={
          mapStyle === 'satellite'
            ? '&copy; <a href="https://www.esri.com/">Esri</a>'
            : '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        }
        url={
          mapStyle === 'default'
            ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            : mapStyle === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        }
        maxZoom={19}
      />
      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topright"
          onCreated={onCreated}
          onEdited={onEdited}
          onDeleted={onDeleted}
          draw={drawConfig}
          edit={editConfig}
        />
      </FeatureGroup>
      <ClusteredMarkers companies={companies} onCompanySelect={onCompanySelect} onExpand={onExpand} popupColumns={popupColumns} recentMarkerClickRef={recentMarkerClickRef} />
      <SelectedMarkerPopup selectedCompany={selectedCompany} popupColumns={popupColumns} onExpand={onExpand} onDeselect={handleDeselect} />
      <MapDeselectHandler onCompanySelectRef={onCompanySelectRef} recentMarkerClickRef={recentMarkerClickRef} />
      <LocationUpdater userLocation={userLocation} />
      <MapRefCapture mapRef={mapInstanceRef} />
      <ResizeWatcher />
    </MapContainer>

    {/* Sidebar toggle — desktop only, right edge, vertically centered */}
    <button
      onClick={onToggleSidebar}
      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1100 }}
      className="hidden md:flex w-8 h-16 rounded-lg bg-white hover:bg-gray-50 border border-gray-300 shadow-md items-center justify-center transition-colors"
      data-tooltip={sidebarOpen ? 'Hide panel' : 'Show panel'} data-tooltip-pos="left"
    >
      <svg
        className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${sidebarOpen ? 'rotate-0' : 'rotate-180'}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>

    {/* Map control buttons — bottom-right on mobile, bottom-left on desktop */}
    <div className="absolute bottom-20 right-3 md:bottom-8 md:left-3 md:right-auto z-[1000] flex flex-col gap-2">
      <button
        onClick={onLocate}
        className="bg-white hover:bg-gray-50 border border-gray-300 shadow-md rounded-lg w-8 h-8 flex items-center justify-center transition-colors"
        data-tooltip="Go to my location" data-tooltip-pos="right"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      <button
        onClick={() => mapInstanceRef.current?.flyTo(FRANCE_CENTER, FRANCE_ZOOM, { animate: true, duration: 1 })}
        className="bg-white hover:bg-gray-50 border border-gray-300 shadow-md rounded-lg w-8 h-8 flex items-center justify-center transition-colors"
        data-tooltip="Reset to France view" data-tooltip-pos="right"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>
    </div>
  </div>
  )
}
