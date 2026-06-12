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

  // Collapsible bottom sheet states
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const startYRef = React.useRef(0);
  const isSheetCollapsedRef = React.useRef(isSheetCollapsed);
  const dragOccurredRef = React.useRef(false);

  useEffect(() => {
    isSheetCollapsedRef.current = isSheetCollapsed;
  }, [isSheetCollapsed]);

  const handleDragStart = (clientY) => {
    setIsDragging(true);
    startYRef.current = clientY;
    setDragOffset(0);
    dragOccurredRef.current = false;
  };

  const handleDragMove = (clientY) => {
    const deltaY = clientY - startYRef.current;
    if (Math.abs(deltaY) > 5) {
      dragOccurredRef.current = true;
    }
    if (isSheetCollapsedRef.current) {
      // Collapsed: only allow dragging UP (negative deltaY)
      setDragOffset(Math.min(0, deltaY));
    } else {
      // Expanded: only allow dragging DOWN (positive deltaY)
      setDragOffset(Math.max(0, deltaY));
    }
  };

  const handleDragEnd = (clientY) => {
    setIsDragging(false);
    const deltaY = clientY - startYRef.current;
    if (Math.abs(deltaY) > 5) {
      dragOccurredRef.current = true;
    }
    if (isSheetCollapsedRef.current) {
      if (deltaY < -60) {
        setIsSheetCollapsed(false);
      }
    } else {
      if (deltaY > 60) {
        setIsSheetCollapsed(true);
      }
    }
    setDragOffset(0);
  };

  const handleTouchStart = (e) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    handleDragEnd(e.changedTouches[0].clientY);
  };

  const handleHandleClick = (e) => {
    if (dragOccurredRef.current) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      setIsSheetCollapsed(prev => !prev);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e) => {
      handleDragMove(e.clientY);
    };

    const onMouseUp = (e) => {
      handleDragEnd(e.clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  // Screen size detection
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (!isActive) return { text: 'On Duty · Standby', color: '#10B981' };
    if (isMatching) return { text: '🚨 Dispatch Pending', color: '#EF4444' };
    if (phase === 3) return { text: '🚑 En Route to Patient', color: '#10B981' };
    if (phase === 4) return { text: '🏥 Transporting to Hospital', color: '#3B82F6' };
    if (phase === 5) return { text: '✅ Mission Completed', color: '#10B981' };
    return { text: 'Standby', color: '#6B7280' };
  };
  const { text: statusText, color: statusColor } = statusLabel();

  // Dynamic layout offsets for Map centering
  const bottomPaddingValue = isLargeScreen 
    ? 0 
    : (isSheetCollapsed ? 60 : Math.round(window.innerHeight * 0.40));
  const leftPaddingValue = isLargeScreen ? 380 : 0;

  // Render Hospital Picker inside the console cards
  const renderHospitalPickerContent = () => {
    return (
      <div>
        <div style={{ color: '#1A365D', fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🏥 Select Nearest Hospital</div>
        <div style={{ color: '#4A5568', fontSize: 11, marginBottom: 16 }}>Real hospitals near patient's location (OpenStreetMap)</div>

        {nearbyHospitals.length === 0 ? (
          <div style={{ color: '#4A5568', textAlign: 'center', padding: '24px 0', fontSize: 12 }}>
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
                width: '100%', marginBottom: 10, padding: '12px 14px',
                borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                background: i === 0 ? '#E6FFFA' : '#FFFFFF',
                border: `1.5px solid ${i === 0 ? '#81E6D9' : '#E2E8F0'}`,
                transition: 'all 0.2s',
                color: '#2D3748'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>🏥</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#1A365D', fontWeight: 700, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{h.name}</div>
                    <div style={{ color: '#718096', fontSize: 10, marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {h.emergency ? '🚨 Emergency Unit · ' : ''}{h.type}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: i === 0 ? '#319795' : '#4A5568', fontWeight: 700, fontSize: 13 }}>{distKm} km</div>
                  {i === 0 && <div style={{ color: '#319795', fontSize: 9, fontWeight: 700 }}>NEAREST</div>}
                </div>
              </div>
            </button>
          );
        })}

        <button
          onClick={() => setShowHospitalPicker(false)}
          style={{
            width: '100%', marginTop: 6, padding: '12px 0', borderRadius: 12,
            background: '#FFF5F5', border: '1px solid #FEB2B2',
            color: '#E53E3E', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >Cancel</button>
      </div>
    );
  };

  const renderConsoleContent = () => {
    if (showHospitalPicker) {
      return renderHospitalPickerContent();
    }

    if (!isActive) {
      return (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg,#EBF8FF,#BEE3F8)',
            margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
            boxShadow: '0 4px 14px rgba(66,153,225,0.2)'
          }}>🚑</div>
          <div style={{ color: '#1A365D', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
            {user?.name || user?.email?.split('@')[0] || 'Emergency Driver'}
          </div>
          <div style={{ color: '#4A5568', fontSize: 13, marginBottom: 20 }}>
            Active Unit ID: {user?.id ? `ALS-${user.id.substring(0, 4).toUpperCase()}` : 'ALS-9876'}
          </div>
          <div style={{
            background: '#E6FFFA', border: '1.5px solid #319795',
            borderRadius: 12, padding: '12px 16px', color: '#234E52', fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 8
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#319795', boxShadow: '0 0 6px #319795' }} />
            On Duty · Standby for dispatch
          </div>
        </div>
      );
    }

    if (isMatching) {
      return (
        <div>
          <div style={{
            background: 'linear-gradient(135deg,#FFF5F5,#FED7D7)',
            border: '1px solid #FEB2B2',
            borderRadius: 14, padding: 16, marginBottom: 16,
            animation: 'slide-up 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24, animation: 'pulse-dot 1s infinite' }}>🚨</span>
              <div>
                <div style={{ color: '#C53030', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Dispatch Broadcast</div>
                <div style={{ color: '#9B2C2C', fontWeight: 800, fontSize: 17 }}>NEW SOS DISPATCH</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InfoChip label="Patient" value={patientName || 'Unknown'} />
              <InfoChip label="Condition" value={symptom || 'Medical Emergency'} />
              <InfoChip label="Distance" value="~1.8 km" />
              <InfoChip label="ETA" value="~4 min" />
            </div>

            {sosLocation && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div style={{ color: '#718096', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Pickup Location</div>
                <div style={{ color: '#2D3748', fontSize: 12, fontWeight: 500 }}>📍 {sosLocation}</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['simulated', 'real'].map(mode => (
              <button
                key={mode}
                onClick={() => setGpsMode(mode)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer',
                  border: gpsMode === mode ? '1.5px solid #2B6CB0' : '1.5px solid #E2E8F0',
                  background: gpsMode === mode ? '#EBF8FF' : '#FFFFFF',
                  color: gpsMode === mode ? '#2B6CB0' : '#4A5568',
                  transition: 'all 0.2s'
                }}
              >
                {mode === 'simulated' ? '⏱ Simulate' : '🛰 Real GPS'}
              </button>
            ))}
          </div>

          <button
            onClick={handleAccept}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 12, fontSize: 14,
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5,
              background: 'linear-gradient(135deg,#E53E3E,#C53030)',
              color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(229,62,62,0.3)',
              transition: 'all 0.1s'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            ✅ Accept Emergency
          </button>
        </div>
      );
    }

    if (phase === 3) {
      return (
        <div>
          <div style={{
            background: '#E6FFFA', border: '1px solid #81E6D9',
            borderRadius: 14, padding: 16, marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24, animation: 'pulse-dot 1.5s infinite' }}>🚑</span>
              <div>
                <div style={{ color: '#234E52', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Dispatch Active</div>
                <div style={{ color: '#1A365D', fontWeight: 800, fontSize: 16 }}>En Route to Patient</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ color: '#234E52', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Progress</div>
                <div style={{ color: '#2F855A', fontWeight: 800, fontSize: 18, fontFamily: 'monospace' }}>{progress}%</div>
              </div>
            </div>

            <div style={{ background: '#CBD5E0', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{
                width: `${progress}%`, height: '100%', borderRadius: 4,
                background: 'linear-gradient(90deg,#319795,#234E52)',
                transition: 'width 0.2s'
              }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InfoChip label="Patient" value={patientName || 'Unknown'} />
              <InfoChip label="GPS Source" value={gpsMode === 'real' ? '🛰 Real Hardware' : '⏱ Simulated'} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#4A5568', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>Route Instructions</div>
            {[
              { step: '1', txt: 'Exit depot, turn left on main avenue', at: 10 },
              { step: '2', txt: 'Continue past central traffic circle', at: 60 },
              { step: '3', txt: 'Turn right to patient rescue point', at: 100 },
            ].map(({ step, txt, at }) => (
              <div key={step} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid #E2E8F0',
                opacity: gpsMode === 'simulated' && progress >= at ? 0.45 : 1,
                transition: 'opacity 0.2s'
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: gpsMode === 'simulated' && progress >= at ? '#E6FFFA' : '#EBF8FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: gpsMode === 'simulated' && progress >= at ? '#319795' : '#2B6CB0',
                  fontSize: 10, fontWeight: 800, border: `1px solid ${gpsMode === 'simulated' && progress >= at ? '#81E6D9' : '#BEE3F8'}`
                }}>{gpsMode === 'simulated' && progress >= at ? '✓' : step}</div>
                <span style={{
                  color: gpsMode === 'simulated' && progress >= at ? '#A0AEC0' : '#2D3748',
                  fontSize: 12,
                  textDecoration: gpsMode === 'simulated' && progress >= at ? 'line-through' : 'none',
                  fontWeight: 500
                }}>{txt}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['simulated', 'real'].map(mode => (
              <button key={mode} onClick={() => setGpsMode(mode)} style={{
                flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer',
                border: gpsMode === mode ? '1.5px solid #2B6CB0' : '1.5px solid #E2E8F0',
                background: gpsMode === mode ? '#EBF8FF' : '#FFFFFF',
                color: gpsMode === mode ? '#2B6CB0' : '#4A5568',
                transition: 'all 0.2s'
              }}>
                {mode === 'simulated' ? '⏱ Simulated' : '🛰 Real GPS'}
              </button>
            ))}
          </div>

          <button
            onClick={handlePatientReached}
            disabled={(gpsMode === 'simulated' && progress < 100) || fetchingHospitals}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 12, fontSize: 13,
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2,
              background: (gpsMode === 'real' || progress >= 100) && !fetchingHospitals
                ? 'linear-gradient(135deg,#319795,#234E52)'
                : '#EDF2F7',
              color: (gpsMode === 'real' || progress >= 100) && !fetchingHospitals ? '#fff' : '#A0AEC0',
              border: 'none',
              cursor: (gpsMode === 'real' || progress >= 100) && !fetchingHospitals ? 'pointer' : 'not-allowed',
              boxShadow: (gpsMode === 'real' || progress >= 100) && !fetchingHospitals ? '0 5px 15px rgba(49,151,149,0.2)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {fetchingHospitals ? '🔍 Querying nearby clinics…' :
             gpsMode === 'simulated' && progress < 100 ? `Transit Progress: ${progress}%` :
             '📍 Patient Reached · Choose Hospital'}
          </button>
        </div>
      );
    }

    if (phase === 4) {
      return (
        <div>
          <div style={{
            background: '#EBF8FF', border: '1px solid #90CDF4',
            borderRadius: 14, padding: 16, marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24, animation: 'pulse-dot 1.5s infinite' }}>🏥</span>
              <div>
                <div style={{ color: '#2B6CB0', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Emergency Transit</div>
                <div style={{ color: '#1A365D', fontWeight: 800, fontSize: 16 }}>Transport to Hospital</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ color: '#2B6CB0', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Progress</div>
                <div style={{ color: '#2B6CB0', fontWeight: 800, fontSize: 18, fontFamily: 'monospace' }}>{progress}%</div>
              </div>
            </div>

            <div style={{ background: '#CBD5E0', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{
                width: `${progress}%`, height: '100%', borderRadius: 4,
                background: 'linear-gradient(90deg,#3182CE,#1A365D)',
                transition: 'width 0.2s'
              }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InfoChip label="Destination" value={selectedHospital?.name || 'Trauma Centre'} />
              <InfoChip label="GPS Source" value={gpsMode === 'real' ? '🛰 Real Hardware' : '⏱ Simulated'} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#4A5568', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>Route Instructions</div>
            {[
              { step: '1', txt: 'Head east on patient local access road', at: 20 },
              { step: '2', txt: 'Merge onto high-speed expressway lanes', at: 70 },
              { step: '3', txt: 'Pull into hospital emergency entrance bay', at: 100 },
            ].map(({ step, txt, at }) => (
              <div key={step} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid #E2E8F0',
                opacity: gpsMode === 'simulated' && progress >= at ? 0.45 : 1,
                transition: 'opacity 0.2s'
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: gpsMode === 'simulated' && progress >= at ? '#EBF8FF' : '#EBF8FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: gpsMode === 'simulated' && progress >= at ? '#2B6CB0' : '#2B6CB0',
                  fontSize: 10, fontWeight: 800, border: `1px solid ${gpsMode === 'simulated' && progress >= at ? '#90CDF4' : '#90CDF4'}`
                }}>{gpsMode === 'simulated' && progress >= at ? '✓' : step}</div>
                <span style={{
                  color: gpsMode === 'simulated' && progress >= at ? '#A0AEC0' : '#2D3748',
                  fontSize: 12,
                  textDecoration: gpsMode === 'simulated' && progress >= at ? 'line-through' : 'none',
                  fontWeight: 500
                }}>{txt}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['simulated', 'real'].map(mode => (
              <button key={mode} onClick={() => setGpsMode(mode)} style={{
                flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer',
                border: gpsMode === mode ? '1.5px solid #2B6CB0' : '1.5px solid #E2E8F0',
                background: gpsMode === mode ? '#EBF8FF' : '#FFFFFF',
                color: gpsMode === mode ? '#2B6CB0' : '#4A5568',
                transition: 'all 0.2s'
              }}>
                {mode === 'simulated' ? '⏱ Simulated' : '🛰 Real GPS'}
              </button>
            ))}
          </div>

          <button
            onClick={completeHandover}
            disabled={gpsMode === 'simulated' && progress < 100}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 12, fontSize: 13,
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2,
              background: gpsMode === 'real' || progress >= 100
                ? 'linear-gradient(135deg,#3182CE,#1A365D)'
                : '#EDF2F7',
              color: gpsMode === 'real' || progress >= 100 ? '#fff' : '#A0AEC0',
              border: 'none',
              cursor: gpsMode === 'real' || progress >= 100 ? 'pointer' : 'not-allowed',
              boxShadow: gpsMode === 'real' || progress >= 100 ? '0 5px 15px rgba(49,151,149,0.2)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {gpsMode === 'simulated' && progress < 100 ? `Transporting: ${progress}%` : '🏥 Handover Completed ✓'}
          </button>
        </div>
      );
    }

    if (phase === 5) {
      return (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#E6FFFA', border: '1.5px solid #319795',
            margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
            color: '#319795', boxShadow: '0 4px 14px rgba(49,151,149,0.15)'
          }}>✓</div>
          <div style={{ color: '#1A365D', fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Mission Completed</div>
          <div style={{ color: '#4A5568', fontSize: 12, marginBottom: 24 }}>
            Patient safely handed over · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            onClick={cancelSOS}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 12, fontSize: 13,
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2,
              background: 'linear-gradient(135deg,#1A365D,#2B6CB0)',
              color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(26,54,93,0.2)',
              transition: 'all 0.2s'
            }}
          >
            Return to Standby
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#F7FAFC' }}>

      {/* ── Map / Standby Placeholder Container ───────────────────── */}
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
            bottomPadding={bottomPaddingValue}
            leftPadding={leftPaddingValue}
          />
        ) : (
          /* Standby placeholder */
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            background: 'linear-gradient(160deg,#ebf8ff 0%,#ffffff 100%)'
          }}>
            <div className="relative flex items-center justify-center">
              <span style={{ fontSize: 64, animation: 'pulse-ping 2s infinite' }}>📡</span>
            </div>
            <p style={{ color: '#2B6CB0', fontSize: 16, fontWeight: 700, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
              ArogyaFlow Dispatch Grid Active
            </p>
            <p style={{ color: '#4A5568', fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.6, marginTop: -8 }}>
              Monitoring emergency broadcast frequencies...
            </p>
          </div>
        )}
      </div>

      {/* ─────────────── DESKTOP SIDEBAR LAYOUT (>= 768px) ─────────────── */}
      {isLargeScreen && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          bottom: '20px',
          width: '380px',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(26, 54, 93, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(26, 54, 93, 0.15)',
          zIndex: 1010,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Sidebar Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(26, 54, 93, 0.1)',
            background: '#1A365D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 10px ${statusColor}`,
                flexShrink: 0,
                animation: isMatching ? 'pulse-dot 1s infinite' : 'none'
              }} />
              <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 14, tracking: 'wide' }}>{statusText}</span>
            </div>
            {isActive && (
              <div style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6
              }}>
                <span style={{ color: '#FFEB3B', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>⏱ {formatTime(countdown)}</span>
              </div>
            )}
          </div>

          {/* Sidebar Scrollable Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} className="custom-scrollbar">
            {renderConsoleContent()}
          </div>
        </div>
      )}

      {/* ─────────────── MOBILE LAYOUT (< 768px) ─────────────── */}
      {!isLargeScreen && (
        <>
          {/* Top Status Overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            background: '#1A365D',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            zIndex: 1010,
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`,
                flexShrink: 0,
                animation: isMatching ? 'pulse-dot 1s infinite' : 'none'
              }} />
              <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13 }}>{statusText}</span>
            </div>

            {isActive && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, padding: '4px 10px', textAlign: 'center'
                }}>
                  <div style={{ color: '#E2E8F0', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Timer</div>
                  <div style={{ color: '#FFEB3B', fontWeight: 800, fontSize: 13, fontFamily: 'monospace' }}>{formatTime(countdown)}</div>
                </div>
                {inTransit && (
                  <div style={{
                    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8, padding: '4px 10px', textAlign: 'center'
                  }}>
                    <div style={{ color: '#E2E8F0', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Progress</div>
                    <div style={{ color: '#4ADE80', fontWeight: 800, fontSize: 13, fontFamily: 'monospace' }}>{progress}%</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Sheet */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid #E2E8F0',
            borderRadius: '20px 20px 0 0',
            padding: '12px 16px 24px 16px',
            zIndex: 1010,
            maxHeight: '55vh',
            overflowY: isSheetCollapsed ? 'hidden' : 'auto',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.08)',
            transform: isDragging
              ? (isSheetCollapsed ? `translateY(calc(100% - 56px + ${dragOffset}px))` : `translateY(${dragOffset}px)`)
              : (isSheetCollapsed ? 'translateY(calc(100% - 56px))' : 'translateY(0)'),
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            {/* Drag Handle Wrapper */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={(e) => {
                e.preventDefault();
                handleDragStart(e.clientY);
              }}
              onClick={handleHandleClick}
              style={{ 
                width: '100%', 
                padding: '8px 0 14px 0', 
                cursor: isDragging ? 'grabbing' : 'grab',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
                userSelect: 'none'
              }}
            >
              <div style={{ width: 40, height: 4, background: '#CBD5E0', borderRadius: 2 }} />
              {isSheetCollapsed && (
                <div style={{ fontSize: 9, color: '#718096', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 }}>
                  Swipe Up or Tap to Expand
                </div>
              )}
            </div>
            
            <div style={{ 
              opacity: isSheetCollapsed ? 0 : 1, 
              transition: 'opacity 0.2s', 
              pointerEvents: isSheetCollapsed ? 'none' : 'auto' 
            }}>
              {renderConsoleContent()}
            </div>
          </div>
        </>
      )}

      {/* Styles */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ping {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(26,54,93,0.15);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(26,54,93,0.3);
        }
      `}</style>
    </div>
  );
}

// Small chip component
function InfoChip({ label, value }) {
  return (
    <div style={{
      background: '#F7FAFC', border: '1px solid #E2E8F0',
      borderRadius: 10, padding: '8px 12px'
    }}>
      <div style={{ color: '#718096', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>{label}</div>
      <div style={{ color: '#1A365D', fontWeight: 600, fontSize: 12, marginTop: 2 }}>{value}</div>
    </div>
  );
}
