'use client';
import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Deal, CATEGORY_META, SG_CENTER } from '@/types';
import DealCard from './DealCard';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeCategoryIcon(emoji: string, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:38px;height:38px;border-radius:50%;background:${color}20;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.18);cursor:pointer;">${emoji}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -40],
  });
}

function userIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function LocationController({ onLocation }: { onLocation: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onLocation(latitude, longitude);
        map.flyTo([latitude, longitude], 14, { duration: 1.5 });
      },
      () => {} // silently fail if denied
    );
  }, [map, onLocation]);

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 80 }}>
      <div className="leaflet-control leaflet-bar">
        <button
          title="My location"
          style={{ width: 30, height: 30, lineHeight: '30px', textAlign: 'center', cursor: 'pointer', background: 'white', border: 'none', fontSize: 16 }}
          onClick={() => {
            navigator.geolocation?.getCurrentPosition((pos) => {
              onLocation(pos.coords.latitude, pos.coords.longitude);
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
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  const handleLocation = useCallback((lat: number, lng: number) => {
    setUserPos([lat, lng]);
  }, []);

  // Only show deals that have real coordinates
  const mappableDeals = deals.filter(
    (d) => d.location?.lat && d.location?.lng &&
      Math.abs(d.location.lat) > 0.1 && Math.abs(d.location.lng) > 0.1
  );

  return (
    <div className="rounded-2xl overflow-hidden border border-brand-border shadow-sm" style={{ height }}>
      <MapContainer
        center={[SG_CENTER[1], SG_CENTER[0]]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <LocationController onLocation={handleLocation} />

        {/* User location dot */}
        {userPos && (
          <>
            <Marker position={userPos} icon={userIcon()} />
            <Circle center={userPos} radius={500} pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.08, weight: 1 }} />
          </>
        )}

        {mappableDeals.map((deal) => {
          const meta = CATEGORY_META[deal.category] || CATEGORY_META.other;
          const icon = makeCategoryIcon(meta.emoji, meta.color);
          const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deal.location.address + ', Singapore')}`;

          return (
            <Marker
              key={deal.id}
              position={[deal.location.lat, deal.location.lng]}
              icon={icon}
              eventHandlers={{ click: () => onDealClick?.(deal) }}
            >
              <Popup minWidth={220} maxWidth={260}>
                <div className="p-1">
                  <p className="font-bold text-sm mb-0.5">{deal.title}</p>
                  <p className="text-xs text-gray-500 mb-2">{deal.location.address}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onDealClick?.(deal)}
                      className="flex-1 text-xs py-1.5 bg-orange-500 text-white rounded-lg font-semibold"
                    >
                      View Deal
                    </button>
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-xs py-1.5 bg-blue-500 text-white rounded-lg font-semibold text-center"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {mappableDeals.length === 0 && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1000, background: 'white', padding: '12px 20px', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', textAlign: 'center', pointerEvents: 'none' }}>
            <p style={{ fontSize: 13, color: '#6B7280' }}>No deals with location data yet</p>
          </div>
        )}
      </MapContainer>
    </div>
  );
}
