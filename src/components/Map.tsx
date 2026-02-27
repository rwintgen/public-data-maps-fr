'use client'

import { MapContainer, TileLayer, FeatureGroup, useMap, Marker, Popup } from 'react-leaflet'
import { EditControl } from 'react-leaflet-draw'
import { useRef, useEffect, useCallback } from 'react'

import L from 'leaflet'

const FRANCE_CENTER: [number, number] = [46.603354, 1.888334]
const FRANCE_ZOOM = 6
delete (L.Icon.Default.prototype as any)._getIconUrl;

const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33],
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [38, 62],
  iconAnchor: [19, 62],
  popupAnchor: [1, -52],
  shadowSize: [62, 62],
});

/** Renders and auto-zooms a larger marker with a popup for the selected company. */
function SelectedMarkerPopup({ selectedCompany, popupColumns, onExpand }: { selectedCompany: any; popupColumns: string[]; onExpand: (company: any) => void }) {
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
            className="mt-2 w-full text-center text-[11px] font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            View details →
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
      style: { color: '#3b82f6', weight: 2, fillOpacity: 0.15 },
    })
    geoLayer.eachLayer((l: any) => featureGroupRef.current?.addLayer(l))
    const bounds = featureGroupRef.current.getBounds()
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [restoreGeometry])

  const clearPreviousLayers = useCallback(() => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers()
    }
  }, [])

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
    onSearch(geo)
  }, [onSearch])

  const onEdited = useCallback((e: any) => {
    const layers = e.layers
    let lastGeometry: any = null
    layers.eachLayer((layer: any) => {
      lastGeometry = layer.toGeoJSON().geometry
    })
    if (lastGeometry) {
      onSearch(lastGeometry)
    }
  }, [onSearch])

  const onDeleted = useCallback(() => {
    onSearch(null)
  }, [onSearch])

  return (
    <div className="w-full h-full relative">
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
          draw={{
            polygon: {
              shapeOptions: {
                color: '#3b82f6',
                weight: 2,
                fillOpacity: 0.15,
              },
              allowIntersection: false,
              showArea: true,
            },
            rectangle: {
              shapeOptions: {
                color: '#3b82f6',
                weight: 2,
                fillOpacity: 0.15,
              },
            },
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
          }}
          edit={{
            edit: {
              selectedPathOptions: {
                color: '#60a5fa',
                fillOpacity: 0.25,
              },
            } as any,
          }}
        />
      </FeatureGroup>
      {companies.map((company, idx) => {
        const companyId = company.fields?.SIRET || `row-${idx}`
        const isSelected = selectedCompany && (selectedCompany.fields?.SIRET === company.fields?.SIRET)
        if (isSelected) return null
        return (
          <Marker
            key={companyId}
            position={[company.lat, company.lon]}
            icon={defaultIcon}
            eventHandlers={{
              click: () => onCompanySelect(company),
            }}
          >
            <Popup>
              <div className="min-w-[160px]">
                {popupColumns.length === 0 ? (
                  <p className="text-xs italic text-gray-400">No columns selected</p>
                ) : (
                  popupColumns.map((col, i) => {
                    const val = company.fields?.[col] ?? ''
                    if (i === 0) return <p key={col} className="font-semibold text-sm leading-tight">{val || '—'}</p>
                    return <p key={col} className="text-xs text-gray-400 mt-0.5">{col}: {val}</p>
                  })
                )}
                <button
                  onClick={() => onExpand(company)}
                  className="mt-2 w-full text-center text-[11px] font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  View details →
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })}
      <SelectedMarkerPopup selectedCompany={selectedCompany} popupColumns={popupColumns} onExpand={onExpand} />
      <LocationUpdater userLocation={userLocation} />
      <MapRefCapture mapRef={mapInstanceRef} />
      <ResizeWatcher />
    </MapContainer>

    {/* Sidebar toggle — right edge, vertically centered */}
    <button
      onClick={onToggleSidebar}
      style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 1100 }}
      className={`w-5 h-14 rounded-l-lg flex items-center justify-center transition-colors duration-200 ${
        isDark
          ? 'bg-gray-900 text-gray-500 hover:text-white'
          : 'bg-white text-gray-400 hover:text-gray-900'
      }`}
      data-tooltip={sidebarOpen ? 'Hide panel' : 'Show panel'} data-tooltip-pos="left"
    >
      <svg
        className={`w-3 h-3 transition-transform duration-300 ${sidebarOpen ? 'rotate-0' : 'rotate-180'}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
      </svg>
    </button>

    {/* Map control buttons — bottom left */}
    <div className="absolute bottom-8 left-3 z-[1000] flex flex-col gap-2">
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
