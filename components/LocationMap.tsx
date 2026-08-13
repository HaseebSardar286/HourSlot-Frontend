'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LocationMap.module.css';

/** Fix default marker icons under Next.js bundling. */
function ensureDefaultIcon() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = L.Icon.Default.prototype as any;
  if (proto._getIconUrl) {
    delete proto._getIconUrl;
  }
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export interface MapMarker {
  id?: string | number;
  lat: number;
  lng: number;
  label?: string;
}

interface LocationMapProps {
  markers: MapMarker[];
  /** Live GPS pin, drawn distinctly from business markers. */
  userLocation?: { lat: number; lng: number } | null;
  height?: number | string;
  zoom?: number;
  className?: string;
  /** When true, fit bounds to all markers */
  fitMarkers?: boolean;
}

function userLocationIcon(className: string, dotClassName: string) {
  return L.divIcon({
    className,
    html: `<span class="${dotClassName}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Read-only Leaflet map showing one or more pins. */
export default function LocationMap({
  markers,
  userLocation = null,
  height = 280,
  zoom = 13,
  className = '',
  fitMarkers = true,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureDefaultIcon();

    const center =
      markers.length > 0
        ? L.latLng(markers[0].lat, markers[0].lng)
        : userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)
          ? L.latLng(userLocation.lat, userLocation.lng)
          : L.latLng(37.7749, -122.4194);

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const onResize = () => map.invalidateSize();
    setTimeout(onResize, 50);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const latLngs: L.LatLng[] = [];

    markers.forEach((m) => {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return;
      const ll = L.latLng(m.lat, m.lng);
      latLngs.push(ll);
      const marker = L.marker(ll);
      if (m.label) marker.bindPopup(m.label);
      marker.addTo(layer);
    });

    if (userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
      const you = L.latLng(userLocation.lat, userLocation.lng);
      latLngs.push(you);
      L.marker(you, {
        icon: userLocationIcon(styles.userMarker, styles.userMarkerDot),
        zIndexOffset: 400,
        keyboard: false,
      })
        .bindPopup('You are here')
        .addTo(layer);
    }

    if (latLngs.length === 1) {
      map.setView(latLngs[0], zoom);
    } else if (latLngs.length > 1 && fitMarkers) {
      map.fitBounds(L.latLngBounds(latLngs).pad(0.2));
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [markers, userLocation, zoom, fitMarkers]);

  return (
    <div
      ref={containerRef}
      className={`${styles.map} ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
}

interface LocationPickerProps {
  address: string;
  latitude: number;
  longitude: number;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (lat: number, lng: number) => void;
  height?: number;
}

/**
 * Interactive map picker: type an address to geocode + pin,
 * drag the pin (or edit lat/lng) for precise coordinates.
 */
export function LocationPicker({
  address,
  latitude,
  longitude,
  onAddressChange,
  onCoordinatesChange,
  height = 260,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextGeocode = useRef(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);

  const setMarkerPosition = useCallback((lat: number, lng: number, pan = true) => {
    const map = mapRef.current;
    if (!map) return;
    ensureDefaultIcon();
    const ll = L.latLng(lat, lng);
    if (!markerRef.current) {
      const marker = L.marker(ll, { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        skipNextGeocode.current = true;
        onCoordinatesChange(
          Number(p.lat.toFixed(6)),
          Number(p.lng.toFixed(6))
        );
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(ll);
    }
    if (pan) map.setView(ll, Math.max(map.getZoom(), 14));
  }, [onCoordinatesChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureDefaultIcon();

    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      [latitude || 37.7749, longitude || -122.4194],
      13
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      skipNextGeocode.current = true;
      onCoordinatesChange(
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6))
      );
    });

    mapRef.current = map;
    setMarkerPosition(latitude || 37.7749, longitude || -122.4194, false);
    setTimeout(() => map.invalidateSize(), 80);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setMarkerPosition(latitude, longitude, true);
  }, [latitude, longitude, setMarkerPosition]);

  const geocodeAddress = useCallback(
    async (query: string) => {
      if (!query.trim() || query.trim().length < 4) return;
      setGeocoding(true);
      setGeoHint(null);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query.trim())}`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json()) as { lat: string; lon: string; display_name?: string }[];
        if (data?.[0]) {
          const lat = Number(Number(data[0].lat).toFixed(6));
          const lng = Number(Number(data[0].lon).toFixed(6));
          skipNextGeocode.current = true;
          onCoordinatesChange(lat, lng);
          setGeoHint('Pinned from address — drag the marker to fine-tune.');
        } else {
          setGeoHint('No match found. Type a fuller address or place the pin manually.');
        }
      } catch {
        setGeoHint('Geocoding failed. Set the pin on the map or enter coordinates.');
      } finally {
        setGeocoding(false);
      }
    },
    [onCoordinatesChange]
  );

  useEffect(() => {
    if (skipNextGeocode.current) {
      skipNextGeocode.current = false;
      return;
    }
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => {
      geocodeAddress(address);
    }, 900);
    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    };
  }, [address, geocodeAddress]);

  return (
    <div className={styles.picker}>
      <div className="form-group">
        <label className="form-label" htmlFor="map-address">
          Address / location
        </label>
        <input
          id="map-address"
          type="text"
          className="input-field"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Start typing an address…"
          autoComplete="street-address"
        />
        <span className={styles.hint}>
          {geocoding ? 'Looking up location…' : geoHint || 'Map updates when you pause typing. Drag the pin for accuracy.'}
        </span>
      </div>

      <div
        ref={containerRef}
        className={styles.map}
        style={{ height }}
        aria-label="Location map"
      />

      <div className={styles.coordsRow}>
        <div className="form-group">
          <label className="form-label" htmlFor="map-lat">
            Latitude
          </label>
          <input
            id="map-lat"
            type="number"
            step="0.000001"
            className="input-field"
            value={Number.isFinite(latitude) ? latitude : ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) {
                skipNextGeocode.current = true;
                onCoordinatesChange(v, longitude);
              }
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="map-lng">
            Longitude
          </label>
          <input
            id="map-lng"
            type="number"
            step="0.000001"
            className="input-field"
            value={Number.isFinite(longitude) ? longitude : ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) {
                skipNextGeocode.current = true;
                onCoordinatesChange(latitude, v);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
