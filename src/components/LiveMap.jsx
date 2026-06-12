import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const patientIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:40px;height:40px">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:rgba(229,62,62,0.25);animation:pulse-red 1.5s infinite"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;background:#E53E3E;border:3px solid white;box-shadow:0 2px 10px rgba(229,62,62,0.7);display:flex;align-items:center;justify-content:center;font-size:13px">🆘</div>
    </div>
    <style>@keyframes pulse-red{0%,100%{opacity:1;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.4;transform:translate(-50%,-50%) scale(1.7)}}</style>
  `,
  iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -22],
});

const ambulanceIcon = L.divIcon({
  className: '',
  html: `<div style="width:38px;height:38px;border-radius:10px;background:#1A365D;border:3px solid #22c55e;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 12px rgba(26,54,93,0.6)">🚑</div>`,
  iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -22],
});

const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="width:38px;height:38px;border-radius:10px;background:#319795;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 12px rgba(49,151,149,0.6)">🏥</div>`,
  iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -22],
});

// ── OSRM real-road routing (free, no API key) ──────────────────────────────
async function fetchRoadRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.routes?.[0]?.geometry?.coordinates) {
      // GeoJSON is [lng,lat] → Leaflet wants [lat,lng]
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
  } catch (e) {
    console.warn('OSRM route fetch failed, using straight line', e.message);
  }
  // Fallback: straight line
  return [[fromLat, fromLng], [toLat, toLng]];
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}

export default function LiveMap({
  patientLat, patientLng,
  driverLat, driverLng,
  hospitalLat, hospitalLng,
  patientName, phase, sosState,
  bottomPadding = 0,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const patientMarkerRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const hospitalMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  // Effective patient coords (fallback to Delhi if GPS denied)
  const pLat = patientLat || (sosState !== 'inactive' ? 28.6139 : null);
  const pLng = patientLng || (sosState !== 'inactive' ? 77.2090 : null);

  // ── 1. Initialize map once ─────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [pLat || 28.6139, pLng || 77.2090],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, []);

  // ── 2. Sync markers (fast, sync, every coord update) ──────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = [];

    // Patient marker
    if (pLat && pLng) {
      const pos = [pLat, pLng];
      bounds.push(pos);
      if (patientMarkerRef.current) {
        patientMarkerRef.current.setLatLng(pos);
      } else {
        patientMarkerRef.current = L.marker(pos, { icon: patientIcon })
          .addTo(map)
          .bindPopup(`<b>🆘 ${patientName || 'Patient'}</b><br/>SOS Location`);
      }
    }

    // Driver/Ambulance marker
    if (driverLat && driverLng) {
      const pos = [driverLat, driverLng];
      bounds.push(pos);
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng(pos);
      } else {
        driverMarkerRef.current = L.marker(pos, { icon: ambulanceIcon })
          .addTo(map)
          .bindPopup('<b>🚑 Ambulance</b><br/>Current position');
      }
    }

    // Hospital marker
    if (hospitalLat && hospitalLng && phase >= 3) {
      const pos = [hospitalLat, hospitalLng];
      bounds.push(pos);
      if (hospitalMarkerRef.current) {
        hospitalMarkerRef.current.setLatLng(pos);
      } else {
        hospitalMarkerRef.current = L.marker(pos, { icon: hospitalIcon })
          .addTo(map)
          .bindPopup('<b>🏥 Destination Hospital</b><br/>Emergency Ward');
      }
    } else if (hospitalMarkerRef.current && phase < 3) {
      hospitalMarkerRef.current.remove();
      hospitalMarkerRef.current = null;
    }

    // Fit bounds (accounting for bottom sheet)
    const bp = bottomPadding || 0;
    if (bounds.length >= 2) {
      try {
        map.fitBounds(L.latLngBounds(bounds), {
          paddingTopLeft: [40, 60],
          paddingBottomRight: [40, bp + 40],
          maxZoom: 16,
        });
      } catch (_) {}
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
      if (bp > 0) {
        setTimeout(() => {
          if (mapInstanceRef.current) mapInstanceRef.current.panBy([0, -(bp / 2)], { animate: false });
        }, 60);
      }
    }
  }, [pLat, pLng, driverLat, driverLng, hospitalLat, hospitalLng, phase, patientName, bottomPadding, sosState]);

  // ── 3. Fetch REAL ROAD route via OSRM (async, triggers on phase/dest change) ──
  useEffect(() => {
    let cancelled = false;

    async function updateRoute() {
      // Remove old route
      if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }

      const map = mapInstanceRef.current;
      if (!map || !driverLat || !driverLng) return;

      let toLat, toLng, color;

      if (phase >= 4 && hospitalLat && hospitalLng) {
        // Transit: driver → hospital (teal)
        toLat = hospitalLat; toLng = hospitalLng; color = '#14b8a6';
      } else if ((phase === 3 || sosState === 'matching') && pLat && pLng) {
        // En route: driver → patient (red)
        toLat = pLat; toLng = pLng; color = '#ef4444';
      } else if (sosState === 'locating' && pLat && pLng) {
        // Locating: preview line (orange)
        toLat = pLat; toLng = pLng; color = '#f97316';
      } else {
        return;
      }

      const routeCoords = await fetchRoadRoute(driverLat, driverLng, toLat, toLng);
      if (cancelled || !mapInstanceRef.current) return;

      routeLineRef.current = L.polyline(routeCoords, {
        color,
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(mapInstanceRef.current);
    }

    updateRoute();
    return () => { cancelled = true; };

  // Only re-fetch route when destination or phase changes — NOT on every driver location update
  // (driver marker still updates every second via effect 2 above)
  }, [phase, sosState, pLat, pLng, hospitalLat, hospitalLng]);

  // Distance labels
  const distToPatient = driverLat && driverLng && pLat && pLng
    ? haversine(driverLat, driverLng, pLat, pLng) : null;
  const distToHospital = driverLat && driverLng && hospitalLat && hospitalLng
    ? haversine(driverLat, driverLng, hospitalLat, hospitalLng) : null;

  return (
    <div className="relative w-full h-full flex flex-col">
      <div ref={mapRef} style={{ flex: 1, width: '100%', height: '100%' }} />

      {/* Distance chip */}
      {(distToPatient || distToHospital) && (
        <div className="absolute bottom-3 left-3 z-[40] flex flex-col space-y-1">
          {phase === 3 && distToPatient && (
            <div className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md font-mono uppercase tracking-wider flex items-center space-x-1.5">
              <span>🆘</span><span>{distToPatient} km to patient</span>
            </div>
          )}
          {phase >= 4 && distToHospital && (
            <div className="bg-teal-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md font-mono uppercase tracking-wider flex items-center space-x-1.5">
              <span>🏥</span><span>{distToHospital} km to hospital</span>
            </div>
          )}
        </div>
      )}

      {/* GPS acquiring overlay */}
      {sosState !== 'inactive' && !pLat && !pLng && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 z-[40]">
          <div className="text-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Acquiring GPS…</p>
          </div>
        </div>
      )}
    </div>
  );
}
