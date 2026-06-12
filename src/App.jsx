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

// Slim dark nav bar for the driver's full-screen map view
function DriverNav() {
  const { user, logout } = useContext(AuthContext);
  return (
    <nav style={{
      background: 'rgba(15,23,42,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      flexShrink: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src={medicalLogo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 14 }}>ArogyaFlow</span>
        <span style={{
          marginLeft: 6, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)',
          color: '#93c5fd', fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: 1, padding: '2px 7px', borderRadius: 6
        }}>Driver</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user?.name && (
          <span style={{ color: '#94a3b8', fontSize: 11 }}>{user.name}</span>
        )}
        <button
          onClick={logout}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#94a3b8', borderRadius: 8, padding: '5px 10px',
            fontSize: 11, cursor: 'pointer', fontWeight: 600
          }}
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
