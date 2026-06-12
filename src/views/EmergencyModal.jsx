import React, { useContext, useEffect, useState } from 'react';
import { EmergencyContext } from '../context/EmergencyContext';
import { supabase } from '../utils/supabaseClient';
import LiveMap from '../components/LiveMap';

export default function ViewCEmergencyModal() {
  const {
    sosState,
    phase,
    countdown,
    selectedAmbulance,
    selectedHospital,
    cancelSOS,
    dbConnected,
    patientLat,
    patientLng,
    driverLat,
    driverLng,
    hospitalLat,
    hospitalLng,
    patientName,
    location: sosLocation,
    symptom
  } = useContext(EmergencyContext);

  const [liveDrivers, setLiveDrivers] = useState([]);

  useEffect(() => {
    if (phase === 2 && dbConnected) {
      supabase.from('profiles').select('*').eq('role', 'driver').then(({ data }) => {
        if (data?.length) setLiveDrivers(data);
      });
    }
  }, [phase, dbConnected]);

  if (sosState === 'inactive') return null;

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // phase labels
  const phaseLabel = {
    1: { text: 'Locating your position…', color: '#f97316', icon: '📍' },
    2: { text: 'Finding nearest ambulance…', color: '#dc2626', icon: '🚨' },
    3: { text: 'Ambulance is on the way', color: '#059669', icon: '🚑' },
    4: { text: 'You are being transported', color: '#2563eb', icon: '🏥' },
    5: { text: 'Safely admitted', color: '#059669', icon: '✅' },
  }[phase] || { text: 'SOS Active', color: '#dc2626', icon: '🆘' };

  // show map from phase 1 onwards whenever we have patient coords
  const showMap = patientLat && patientLng && phase < 5;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>

      {/* ── Top status bar ── */}
      <div style={{
        background: 'rgba(15,23,42,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: phaseLabel.color,
            boxShadow: `0 0 10px ${phaseLabel.color}`,
            animation: phase < 3 ? 'pulse-dot 1s infinite' : 'none',
            flexShrink: 0
          }} />
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 14 }}>
              {phaseLabel.icon} {phaseLabel.text}
            </div>
            {sosLocation && (
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>📍 {sosLocation}</div>
            )}
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '4px 12px', textAlign: 'center'
        }}>
          <div style={{ color: '#94a3b8', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Timer</div>
          <div style={{ color: '#f97316', fontWeight: 800, fontSize: 15, fontFamily: 'monospace' }}>{formatTime(countdown)}</div>
        </div>
      </div>

      {/* ── Map (full screen) ── */}
      {showMap ? (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <LiveMap
            patientLat={patientLat}
            patientLng={patientLng}
            driverLat={driverLat}
            driverLng={driverLng}
            hospitalLat={hospitalLat}
            hospitalLng={hospitalLng}
            patientName={patientName}
            phase={phase}
            sosState={sosState}
            bottomPadding={Math.round(window.innerHeight * 0.40)}
          />
          {/* "Your location" label over map */}
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 50,
            background: 'rgba(220,38,38,0.9)', borderRadius: 8,
            padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6
          }}>
            <span style={{ fontSize: 14 }}>🆘</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>Your SOS Location</span>
          </div>
          {driverLat && driverLng && (
            <div style={{
              position: 'absolute', top: 12, right: 12, zIndex: 50,
              background: 'rgba(5,150,105,0.9)', borderRadius: 8,
              padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{ fontSize: 14 }}>🚑</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>Ambulance</span>
            </div>
          )}
        </div>
      ) : (
        /* No GPS yet — show spinner */
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: 'linear-gradient(160deg,#0f172a,#1e293b)'
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: `4px solid ${phaseLabel.color}`,
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
            {phase === 5 ? 'You have been admitted safely' : 'Acquiring your location…'}
          </div>
        </div>
      )}

      {/* ── Bottom info sheet ── */}
      <div style={{
        background: 'rgba(15,23,42,0.96)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '20px 20px 0 0',
        padding: '16px 16px 24px',
        flexShrink: 0,
        maxHeight: '45vh',
        overflowY: 'auto'
      }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />

        {/* Phase 1 — Locating */}
        {phase === 1 && (
          <div style={{ textAlign: 'center', paddingBottom: 8 }}>
            <div style={{ color: '#f97316', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>📡 Broadcasting SOS Signal</div>
            <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>
              Your location is being locked and broadcast to all nearby ambulances.
            </div>
          </div>
        )}

        {/* Phase 2 — Matching */}
        {phase === 2 && (
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 15, marginBottom: 12 }}>
              🚨 Matching Ambulance…
            </div>
            {liveDrivers.length > 0 ? liveDrivers.slice(0, 2).map((d, i) => (
              <div key={d.id} style={{
                background: i === 0 ? 'rgba(5,150,105,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === 0 ? 'rgba(5,150,105,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12, padding: '10px 12px', marginBottom: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🚑</span>
                  <div>
                    <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{d.name}</div>
                    <div style={{ color: '#64748b', fontSize: 10 }}>ALS-{d.id.substring(0, 4).toUpperCase()}</div>
                  </div>
                </div>
                <div style={{
                  background: i === 0 ? 'rgba(5,150,105,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${i === 0 ? 'rgba(5,150,105,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 6, padding: '3px 8px',
                  color: i === 0 ? '#4ade80' : '#64748b', fontSize: 10, fontWeight: 700
                }}>
                  {i === 0 ? 'AVAILABLE' : 'STANDBY'}
                </div>
              </div>
            )) : (
              <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
                Searching for available drivers…
              </div>
            )}
            <button onClick={cancelSOS} style={{
              width: '100%', marginTop: 8, padding: '10px 0', borderRadius: 10,
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              color: '#fca5a5', fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}>Cancel SOS</button>
          </div>
        )}

        {/* Phase 3 — Ambulance en route */}
        {phase === 3 && selectedAmbulance && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0
              }}>🚑</div>
              <div>
                <div style={{ color: '#4ade80', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Ambulance Dispatched</div>
                <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 15 }}>{selectedAmbulance.driverName}</div>
                <div style={{ color: '#64748b', fontSize: 11 }}>{selectedAmbulance.vehicleId} · {selectedAmbulance.phone}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>ETA</div>
                <div style={{ color: '#22c55e', fontWeight: 800, fontSize: 18, fontFamily: 'monospace' }}>{formatTime(countdown)}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <InfoChip label="Hospital" value={selectedHospital?.name || 'Nearest Trauma Centre'} />
              <InfoChip label="Status" value="🟢 En Route to You" />
            </div>
            <button onClick={cancelSOS} style={{
              width: '100%', padding: '10px 0', borderRadius: 10,
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              color: '#fca5a5', fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}>Cancel Dispatch</button>
          </div>
        )}

        {/* Phase 4 — In transit */}
        {phase === 4 && selectedAmbulance && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0
              }}>🏥</div>
              <div>
                <div style={{ color: '#93c5fd', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>You're on Board</div>
                <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 15 }}>Being Transported</div>
                <div style={{ color: '#64748b', fontSize: 11 }}>{selectedHospital?.name || 'Emergency Ward'}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>Hospital ETA</div>
                <div style={{ color: '#60a5fa', fontWeight: 800, fontSize: 18, fontFamily: 'monospace' }}>{formatTime(countdown)}</div>
              </div>
            </div>
            <div style={{
              background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)',
              borderRadius: 10, padding: '10px 14px', color: '#93c5fd', fontSize: 12, textAlign: 'center'
            }}>
              🛡️ Emergency crew pre-notified · Stay calm
            </div>
          </div>
        )}

        {/* Phase 5 — Done */}
        {phase === 5 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Safely Admitted</div>
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>You have been handed over to the emergency clinical team.</div>
            <button onClick={cancelSOS} style={{
              width: '100%', padding: '14px 0', borderRadius: 12,
              background: 'linear-gradient(135deg,#059669,#047857)',
              color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer'
            }}>Return to Portal</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.4;transform:scale(1.4)}
        }
        @keyframes spin {
          to{transform:rotate(360deg)}
        }
      `}</style>
    </div>
  );
}

function InfoChip({ label, value }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, padding: '7px 10px'
    }}>
      <div style={{ color: '#94a3b8', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 11, marginTop: 2 }}>{value}</div>
    </div>
  );
}
