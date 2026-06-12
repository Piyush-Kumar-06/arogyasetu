import React, { useContext, useState, useEffect } from 'react';
import { EmergencyContext } from '../context/EmergencyContext';
import { AuthContext } from '../context/AuthContext';
import LiveMap from '../components/LiveMap';

export default function ViewEDriver() {
  const {
    sosState,
    phase,
    countdown,
    selectedAmbulance,
    selectedHospital,
    patientName,
    symptom,
    location: sosLocation,
    acceptSOS,
    reachPatient,
    completeHandover,
    cancelSOS,
    patientLat,
    patientLng,
    driverLat,
    driverLng,
    hospitalLat,
    hospitalLng,
    updateDriverLocation,
    updateHospital
  } = useContext(EmergencyContext);

  const { user } = useContext(AuthContext);

  const [progress, setProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gpsMode, setGpsMode] = useState('simulated');

  // Driver's own real-time GPS (captured as soon as SOS appears)
  const [myLat, setMyLat] = useState(null);
  const [myLng, setMyLng] = useState(null);

  // Hospital picker state
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [showHospitalPicker, setShowHospitalPicker] = useState(false);
  const [fetchingHospitals, setFetchingHospitals] = useState(false);

  // Auto-drive simulation effect
  useEffect(() => {
    let timer;
    if (gpsMode === 'simulated' && isSimulating && progress < 100 && (phase === 3 || phase === 4)) {
      timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) { setIsSimulating(false); clearInterval(timer); return 100; }
          return prev + 2;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isSimulating, progress, gpsMode, phase]);

  // Reset progress & start simulation when phase changes
  useEffect(() => {
    setProgress(0);
    setIsSimulating(true);
  }, [phase]);

  // ── Always capture driver's real GPS when any SOS is active ──
  useEffect(() => {
    let watchId = null;
    const isActive = sosState !== 'inactive';
    if (isActive && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        ({ coords }) => {
          setMyLat(coords.latitude);
          setMyLng(coords.longitude);
          // If in dispatched/transit phase AND using real GPS mode, sync to DB too
          if ((phase === 3 || phase === 4) && gpsMode === 'real') {
            updateDriverLocation(coords.latitude, coords.longitude);
          }
        },
        err => console.error('Driver GPS error:', err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [sosState, phase, gpsMode]);

  // Simulated coordinate sync
  useEffect(() => {
    if (gpsMode !== 'simulated' || !isSimulating || (phase !== 3 && phase !== 4)) return;
    const pLat = patientLat || 28.6139, pLng = patientLng || 77.2090;
    const hLat = hospitalLat || 28.6055, hLng = hospitalLng || 77.2273;
    const startLat = pLat + 0.005, startLng = pLng - 0.005;
    let lat, lng;
    if (phase === 3) {
      lat = startLat + (pLat - startLat) * (progress / 100);
      lng = startLng + (pLng - startLng) * (progress / 100);
    } else {
      lat = pLat + (hLat - pLat) * (progress / 100);
      lng = pLng + (hLng - pLng) * (progress / 100);
    }
    updateDriverLocation(lat, lng);
  }, [progress, phase, gpsMode, isSimulating, patientLat, patientLng, hospitalLat, hospitalLng]);

  const handleAccept = () => {
    acceptSOS(
      {
        driverName: user?.name || user?.email?.split('@')[0] || 'Emergency Driver',
        vehicleId: user?.id ? `ALS-${user.id.substring(0, 4).toUpperCase()}` : 'ALS-9876',
        distance: '1.8 km',
        phone: user?.phone || user?.email || '+91 99887 76655'
      },
      { name: selectedHospital?.name || 'Nearest Trauma Centre', icuBeds: 5, distance: '3.4 km' },
      null, // hospitalCoords (use default)
      { lat: myLat, lng: myLng } // driver's real GPS coords
    );
  };

  // ── Fetch real nearby hospitals via Overpass API ──────────────────────
  const fetchNearbyHospitals = async (lat, lng) => {
    const query = `[out:json][timeout:20];(
      node["amenity"="hospital"](around:10000,${lat},${lng});
      way["amenity"="hospital"](around:10000,${lat},${lng});
      node["amenity"="clinic"](around:5000,${lat},${lng});
    );out center;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(15000)
    });
    const data = await res.json();
    return (data.elements || [])
      .map(el => ({
        id: el.id,
        name: el.tags?.name || el.tags?.['name:en'] || null,
        lat: el.lat || el.center?.lat,
        lng: el.lon || el.center?.lon,
        emergency: el.tags?.emergency === 'yes',
        type: el.tags?.['healthcare:speciality'] || el.tags?.amenity || 'hospital',
      }))
      .filter(h => h.lat && h.lng && h.name)
      .sort((a, b) => {
        const dA = Math.hypot(a.lat - lat, a.lng - lng);
        const dB = Math.hypot(b.lat - lat, b.lng - lng);
        return dA - dB;
      })
      .slice(0, 6);
  };

  // When driver taps "Patient Reached" — show real hospital picker first
  const handlePatientReached = async () => {
    if (gpsMode === 'simulated' && progress < 100) return;
    const pLat = patientLat || myLat || 28.6139;
    const pLng = patientLng || myLng || 77.2090;
    setFetchingHospitals(true);
    try {
      const hospitals = await fetchNearbyHospitals(pLat, pLng);
      setNearbyHospitals(hospitals);
      setShowHospitalPicker(true);
    } catch (err) {
      console.error('Hospital fetch failed:', err);
      // Fallback: use default and proceed
      await reachPatient();
    } finally {
      setFetchingHospitals(false);
    }
  };

  const handleSelectHospital = async (hospital) => {
    setShowHospitalPicker(false);
    await updateHospital(hospital);
    await reachPatient();
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ─── Phase helpers ────────────────────────────────────────────────────────
  const isActive = sosState !== 'inactive';
  const isMatching = sosState === 'matching';
  const inTransit = phase === 3 || phase === 4;
  const done = phase === 5;

  const statusLabel = () => {
    if (!isActive) return { text: 'On Duty · Standby', color: '#6B7280' };
    if (isMatching) return { text: '🚨 New Emergency Incoming', color: '#DC2626' };
    if (phase === 3) return { text: '🚑 En Route to Patient', color: '#059669' };
    if (phase === 4) return { text: '🏥 Transporting to Hospital', color: '#2563EB' };
    if (phase === 5) return { text: '✅ Handover Complete', color: '#059669' };
    return { text: 'Standby', color: '#6B7280' };
  };
  const { text: statusText, color: statusColor } = statusLabel();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#0f172a' }}>

      {/* ── Full-screen Map ───────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {isActive ? (
          <LiveMap
            patientLat={patientLat}
            patientLng={patientLng}
            driverLat={driverLat || myLat}
            driverLng={driverLng || myLng}
            hospitalLat={hospitalLat}
            hospitalLng={hospitalLng}
            patientName={patientName}
            phase={phase}
            sosState={sosState}
            bottomPadding={Math.round(window.innerHeight * 0.52)}
          />
        ) : (
          /* Standby placeholder */
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)'
          }}>
            <span style={{ fontSize: 56 }}>📡</span>
            <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
              Radar active — awaiting emergency broadcast signal from dispatch centre
            </p>
          </div>
        )}
      </div>

      {/* ── Top Status Bar ───────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        background: 'rgba(15,23,42,0.82)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: statusColor,
            boxShadow: `0 0 8px ${statusColor}`,
            flexShrink: 0,
            animation: isMatching ? 'pulse-dot 1s infinite' : 'none'
          }} />
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{statusText}</span>
        </div>

        {isActive && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '4px 10px', textAlign: 'center'
            }}>
              <div style={{ color: '#94a3b8', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Timer</div>
              <div style={{ color: '#f97316', fontWeight: 800, fontSize: 13, fontFamily: 'monospace' }}>{formatTime(countdown)}</div>
            </div>
            {inTransit && (
              <div style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '4px 10px', textAlign: 'center'
              }}>
                <div style={{ color: '#94a3b8', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Progress</div>
                <div style={{ color: '#22c55e', fontWeight: 800, fontSize: 13, fontFamily: 'monospace' }}>{progress}%</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Action Sheet ──────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(15,23,42,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 16px',
        zIndex: 50,
        maxHeight: '55vh',
        overflowY: 'auto'
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 16px' }} />

        {/* ── STANDBY STATE ── */}
        {!isActive && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)',
              margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
            }}>🚑</div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              {user?.name || user?.email?.split('@')[0] || 'Driver'}
            </div>
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
              Vehicle: {user?.id ? `ALS-${user.id.substring(0, 4).toUpperCase()}` : 'ALS-XXXX'}
            </div>
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 10, padding: '10px 16px', color: '#4ade80', fontSize: 12
            }}>
              ✓ Online · Ready for dispatch
            </div>
          </div>
        )}

        {/* ── INCOMING SOS (matching) ── */}
        {isMatching && (
          <div>
            {/* Pulsing alert */}
            <div style={{
              background: 'linear-gradient(135deg,rgba(220,38,38,0.2),rgba(239,68,68,0.1))',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 14, padding: 16, marginBottom: 16,
              animation: 'slide-up 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>🚨</span>
                <div>
                  <div style={{ color: '#fca5a5', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Emergency Request</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>NEW SOS ALERT</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <InfoChip label="Patient" value={patientName || 'Unknown'} />
                <InfoChip label="Condition" value={symptom || 'Medical Emergency'} />
                <InfoChip label="Distance" value="~1.8 km" />
                <InfoChip label="ETA" value="~4 min" />
              </div>

              {sosLocation && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                  <span style={{ color: '#94a3b8', fontSize: 10 }}>📍 </span>
                  <span style={{ color: '#cbd5e1', fontSize: 11 }}>{sosLocation}</span>
                </div>
              )}
            </div>

            {/* GPS Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {['simulated', 'real'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setGpsMode(mode)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer',
                    border: gpsMode === mode ? '1.5px solid #3b82f6' : '1.5px solid rgba(255,255,255,0.1)',
                    background: gpsMode === mode ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                    color: gpsMode === mode ? '#93c5fd' : '#64748b',
                    transition: 'all 0.2s'
                  }}
                >
                  {mode === 'simulated' ? '⏱ Simulate' : '🛰 Real GPS'}
                </button>
              ))}
            </div>

            {/* ACCEPT button */}
            <button
              onClick={handleAccept}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14, fontSize: 15,
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5,
                background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                color: '#fff', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(220,38,38,0.5)',
                transition: 'transform 0.1s'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              ✅ Accept Ride
            </button>
          </div>
        )}

        {/* ── DISPATCHED / EN ROUTE TO PATIENT (phase 3) ── */}
        {phase === 3 && (
          <div>
            <div style={{
              background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)',
              borderRadius: 14, padding: 14, marginBottom: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>🚑</span>
                <div>
                  <div style={{ color: '#6ee7b7', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>En Route</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Heading to Patient</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ color: '#6ee7b7', fontSize: 10 }}>Progress</div>
                  <div style={{ color: '#22c55e', fontWeight: 800, fontSize: 18, fontFamily: 'monospace' }}>{progress}%</div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${progress}%`, height: '100%', borderRadius: 4,
                  background: 'linear-gradient(90deg,#22c55e,#16a34a)',
                  transition: 'width 0.2s'
                }} />
              </div>

              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <InfoChip label="Patient" value={patientName || 'Unknown'} />
                <InfoChip label="Mode" value={gpsMode === 'real' ? '🛰 GPS' : '⏱ Simulated'} />
              </div>
            </div>

            {/* Turn-by-turn directions */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Turn-by-Turn</div>
              {[
                { step: '1', txt: 'Exit depot, turn left on main avenue', at: 10 },
                { step: '2', txt: 'Continue past central traffic circle', at: 60 },
                { step: '3', txt: 'Turn right to patient rescue point', at: 100 },
              ].map(({ step, txt, at }) => (
                <div key={step} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  opacity: gpsMode === 'simulated' && progress >= at ? 0.35 : 1
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: gpsMode === 'simulated' && progress >= at ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: gpsMode === 'simulated' && progress >= at ? '#22c55e' : '#93c5fd',
                    fontSize: 10, fontWeight: 800
                  }}>{gpsMode === 'simulated' && progress >= at ? '✓' : step}</div>
                  <span style={{
                    color: gpsMode === 'simulated' && progress >= at ? '#475569' : '#e2e8f0',
                    fontSize: 12,
                    textDecoration: gpsMode === 'simulated' && progress >= at ? 'line-through' : 'none'
                  }}>{txt}</span>
                </div>
              ))}
            </div>

            {/* GPS toggle + Arrived button */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['simulated', 'real'].map(mode => (
                <button key={mode} onClick={() => setGpsMode(mode)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer',
                  border: gpsMode === mode ? '1.5px solid #3b82f6' : '1.5px solid rgba(255,255,255,0.1)',
                  background: gpsMode === mode ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                  color: gpsMode === mode ? '#93c5fd' : '#64748b',
                }}>
                  {mode === 'simulated' ? '⏱ Sim' : '🛰 Real'}
                </button>
              ))}
            </div>

            <button
              onClick={handlePatientReached}
              disabled={(gpsMode === 'simulated' && progress < 100) || fetchingHospitals}
              style={{
                width: '100%', padding: '15px 0', borderRadius: 14, fontSize: 14,
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1,
                background: (gpsMode === 'real' || progress >= 100) && !fetchingHospitals
                  ? 'linear-gradient(135deg,#059669,#047857)'
                  : 'rgba(255,255,255,0.06)',
                color: (gpsMode === 'real' || progress >= 100) && !fetchingHospitals ? '#fff' : '#475569',
                border: 'none',
                cursor: (gpsMode === 'real' || progress >= 100) && !fetchingHospitals ? 'pointer' : 'not-allowed',
                boxShadow: (gpsMode === 'real' || progress >= 100) && !fetchingHospitals ? '0 4px 20px rgba(5,150,105,0.45)' : 'none',
              }}
            >
              {fetchingHospitals ? '🔍 Finding nearby hospitals…' :
               gpsMode === 'simulated' && progress < 100 ? `Driving… ${progress}%` :
               '📍 Patient Reached — Select Hospital'}
            </button>
          </div>
        )}

        {/* ── TRANSIT TO HOSPITAL (phase 4) ── */}
        {phase === 4 && (
          <div>
            <div style={{
              background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)',
              borderRadius: 14, padding: 14, marginBottom: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>🏥</span>
                <div>
                  <div style={{ color: '#93c5fd', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Patient On Board</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Transit to Hospital</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ color: '#93c5fd', fontSize: 10 }}>Progress</div>
                  <div style={{ color: '#60a5fa', fontWeight: 800, fontSize: 18, fontFamily: 'monospace' }}>{progress}%</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${progress}%`, height: '100%', borderRadius: 4,
                  background: 'linear-gradient(90deg,#3b82f6,#1d4ed8)', transition: 'width 0.2s'
                }} />
              </div>

              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <InfoChip label="Hospital" value={selectedHospital?.name || 'Trauma Centre'} />
                <InfoChip label="Mode" value={gpsMode === 'real' ? '🛰 GPS' : '⏱ Simulated'} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Turn-by-Turn</div>
              {[
                { step: '1', txt: 'Head east on patient local access road', at: 20 },
                { step: '2', txt: 'Merge onto high-speed expressway lanes', at: 70 },
                { step: '3', txt: 'Pull into hospital emergency entrance bay', at: 100 },
              ].map(({ step, txt, at }) => (
                <div key={step} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  opacity: gpsMode === 'simulated' && progress >= at ? 0.35 : 1
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: gpsMode === 'simulated' && progress >= at ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: gpsMode === 'simulated' && progress >= at ? '#3b82f6' : '#93c5fd',
                    fontSize: 10, fontWeight: 800
                  }}>{gpsMode === 'simulated' && progress >= at ? '✓' : step}</div>
                  <span style={{
                    color: gpsMode === 'simulated' && progress >= at ? '#475569' : '#e2e8f0',
                    fontSize: 12,
                    textDecoration: gpsMode === 'simulated' && progress >= at ? 'line-through' : 'none'
                  }}>{txt}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['simulated', 'real'].map(mode => (
                <button key={mode} onClick={() => setGpsMode(mode)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer',
                  border: gpsMode === mode ? '1.5px solid #3b82f6' : '1.5px solid rgba(255,255,255,0.1)',
                  background: gpsMode === mode ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                  color: gpsMode === mode ? '#93c5fd' : '#64748b',
                }}>
                  {mode === 'simulated' ? '⏱ Sim' : '🛰 Real'}
                </button>
              ))}
            </div>

            <button
              onClick={completeHandover}
              disabled={gpsMode === 'simulated' && progress < 100}
              style={{
                width: '100%', padding: '15px 0', borderRadius: 14, fontSize: 14,
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1,
                background: gpsMode === 'real' || progress >= 100
                  ? 'linear-gradient(135deg,#2563eb,#1d4ed8)'
                  : 'rgba(255,255,255,0.06)',
                color: gpsMode === 'real' || progress >= 100 ? '#fff' : '#475569',
                border: 'none',
                cursor: gpsMode === 'real' || progress >= 100 ? 'pointer' : 'not-allowed',
                boxShadow: gpsMode === 'real' || progress >= 100 ? '0 4px 20px rgba(37,99,235,0.45)' : 'none',
              }}
            >
              {gpsMode === 'simulated' && progress < 100 ? `Transporting… ${progress}%` : '🏥 Handover Complete ✓'}
            </button>
          </div>
        )}

        {/* ── HANDOVER COMPLETE (phase 5) ── */}
        {phase === 5 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Mission Complete</div>
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 20 }}>
              Patient handed over · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
              onClick={cancelSOS}
              style={{
                width: '100%', padding: '15px 0', borderRadius: 14, fontSize: 14,
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1,
                background: 'linear-gradient(135deg,#1e40af,#1d4ed8)',
                color: '#fff', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(37,99,235,0.4)'
              }}
            >
              Return to Standby
            </button>
          </div>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Hospital Picker Overlay ───────────────────────────────────── */}
      {showHospitalPicker && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: 'rgba(15,23,42,0.98)',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '20px 20px 0 0',
            padding: '20px 16px 32px',
            maxHeight: '80vh', overflowY: 'auto',
            animation: 'slide-up 0.3s ease'
          }}>
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🏥 Select Nearest Hospital</div>
            <div style={{ color: '#64748b', fontSize: 11, marginBottom: 16 }}>Real hospitals near patient's location (OpenStreetMap)</div>

            {nearbyHospitals.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
                No hospitals found nearby. Proceeding with default.
              </div>
            ) : nearbyHospitals.map((h, i) => {
              const distKm = (Math.hypot(
                (h.lat - (patientLat || 28.6139)) * 111,
                (h.lng - (patientLng || 77.209)) * 111 * Math.cos((patientLat || 28.6139) * Math.PI / 180)
              )).toFixed(1);
              return (
                <button
                  key={h.id}
                  onClick={() => handleSelectHospital({ ...h, distance: `${distKm} km` })}
                  style={{
                    width: '100%', marginBottom: 10, padding: '14px',
                    borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                    background: i === 0 ? 'rgba(5,150,105,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${i === 0 ? 'rgba(5,150,105,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>🏥</span>
                      <div>
                        <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{h.name}</div>
                        <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                          {h.emergency ? '🚨 Emergency Unit · ' : ''}{h.type}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: i === 0 ? '#4ade80' : '#94a3b8', fontWeight: 700, fontSize: 13 }}>{distKm} km</div>
                      {i === 0 && <div style={{ color: '#4ade80', fontSize: 9 }}>NEAREST</div>}
                    </div>
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => setShowHospitalPicker(false)}
              style={{
                width: '100%', marginTop: 6, padding: '12px 0', borderRadius: 12,
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                color: '#fca5a5', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Small chip component
function InfoChip({ label, value }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, padding: '6px 10px'
    }}>
      <div style={{ color: '#94a3b8', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 11, marginTop: 1 }}>{value}</div>
    </div>
  );
}
