import React, { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { QueueProvider } from './context/QueueContext';
import { EmergencyProvider } from './context/EmergencyContext';
import AppShell from './components/AppShell';
import ViewAPatient from './views/PatientPortal';
import ViewBDoctor from './views/DoctorModule';
import ViewDPharmacyAdmin from './views/PharmacyAdmin';
import ViewEDriver from './views/DriverPortal';
import LoginView from './views/LoginView';
import medicalLogo from './assets/ArogyaFlow Medical Logo Gradient.jpg';

// Slim light nav bar for the driver's full-screen map view (matches AppShell color scheme)
function DriverNav() {
  const { user, logout } = useContext(AuthContext);
  return (
    <nav style={{
      background: '#1A365D',
      borderBottom: '1px solid rgba(255,255,255,0.12)',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      flexShrink: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={medicalLogo} alt="logo" style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 6 }} />
        <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 16, tracking: 'tight' }}>ArogyaFlow</span>
        <span style={{
          marginLeft: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
          color: '#FFFFFF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: 1.2, padding: '2px 8px', borderRadius: 6
        }}>Driver</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user?.name && (
          <span style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600 }}>{user.name}</span>
        )}
        <button
          onClick={logout}
          style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#FFFFFF', borderRadius: 8, padding: '6px 12px',
            fontSize: 11, cursor: 'pointer', fontWeight: 700,
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

function MainAppContent() {
  const { role, isLoggedIn, isAuthLoading } = useContext(AuthContext);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1A365D] border-t-transparent mb-4" />
        <span className="font-mono text-xs uppercase tracking-widest text-[#718096] font-bold">
          Loading Health Grid Session...
        </span>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginView />;
  }

  // Driver → full viewport, no AppShell padding
  if (role === 'driver') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
        <DriverNav />
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <ViewEDriver />
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      {role === 'patient' && <ViewAPatient />}
      {role === 'doctor' && <ViewBDoctor />}
      {role === 'pharmacy' && <ViewDPharmacyAdmin />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueueProvider>
        <EmergencyProvider>
          <MainAppContent />
        </EmergencyProvider>
      </QueueProvider>
    </AuthProvider>
  );
}
