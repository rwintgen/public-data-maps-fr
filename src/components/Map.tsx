
'use client'

import { MapContainer, TileLayer, FeatureGroup, useMap, Marker, Popup } from 'react-leaflet'
import { EditControl } from 'react-leaflet-draw'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

// Fix for marker icon issue with webpack
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MapUpdater = ({ selectedCompany }: { selectedCompany: any }) => {
  const map = useMap()
  if (selectedCompany) {
    map.setView([selectedCompany.lat, selectedCompany.lon], 15)
  }
  return null
}

export default function Map({ companies, selectedCompany, onSearch }: { companies: any[], selectedCompany: any, onSearch: (geometry: any) => void }) {
  const onCreated = (e: any) => {
    onSearch(e.layer.toGeoJSON().geometry)
  }

  const onDeleted = () => {
    onSearch(null);
  };

  return (
    <MapContainer center={[46.603354, 1.888334]} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FeatureGroup>
        <EditControl
          position="topright"
          onCreated={onCreated}
          onDeleted={onDeleted}
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
          }}
        />
      </FeatureGroup>
      {companies.map(company => (
        <Marker key={company.siret} position={[company.lat, company.lon]}>
          <Popup>{company.name}</Popup>
        </Marker>
      ))}
      <MapUpdater selectedCompany={selectedCompany} />
    </MapContainer>
  )
}
