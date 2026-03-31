'use client';
import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Deal, CATEGORY_META, SG_CENTER } from '@/types';
import DealCard from './DealCard';

// Fix Leaflet default marker icon broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/** Custom emoji marker for each category */
function makeCategoryIcon(emoji: string, color: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:38px;height:38px;border-radius:50%;
        background:${color}20;border:2.5px solid ${color};
        display:flex;align-items:center;justify-content:center;
        font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.18);
        cursor:pointer;transition:transform .15s;
      ">${emoji}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -40],
  });
}

/** Fly to user location button */
function LocateControl() {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 80 }}>
      <div className="leaflet-control leaflet-bar">
        <button
          title="My location"
          style={{
            width: 30, height: 30, lineHeight: '30px',
            textAlign: 'center', cursor: 'pointer',
            background: 'white', border: 'none',
            fontSize: 16,
          }}
          onClick={() => {
            navigator.geolocation?.getCurrentPosition((pos) => {
              map.flyTo([pos.coords.latitude, pos.coords.longitude], 14);
            });
          }}
        >
          📍
        </button>
      </div>
    </div>
  );
}

interface Props {
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
  height?: string;
}

export default function MapView({ deals, onDealClick, height = '600px' }: Props) {
  const [selected, setSelected] = useState<Deal | null>(null);

  const handleMarkerClick = useCallback((deal: Deal) => {
    setSelected(deal);
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden border border-brand-border shadow-sm"
      style={{ height }}
    >
      <MapContainer
        center={[SG_CENTER[1], SG_CENTER[0]]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        {/* OpenStreetMap tiles — free, no API key */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <LocateControl />

        {deals.map((deal) => {
          const meta = CATEGORY_META[deal.category] || CATEGORY_META.other;
          const icon = makeCategoryIcon(meta.emoji, meta.color);

          return (
            <Marker
              key={deal.id}
              position={[deal.location.lat, deal.location.lng]}
              icon={icon}
              eventHandlers={{ click: () => handleMarkerClick(deal) }}
            >
              <Popup minWidth={260} maxWidth={280}>
                <div className="p-1">
                  <DealCard
                    deal={deal}
                    compact
                    onClick={(d) => {
                      onDealClick?.(d);
                    }}
                  />
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
