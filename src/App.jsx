import React, { useContext, useState, useRef, useEffect } from 'react';
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

// Slim light nav bar for the driver's full-screen map view (matches AppShell color scheme & supports responsive hamburger drawer)
function DriverNav() {
  const { user, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerLangRef = useRef(null);
  const drawerLangRef = useRef(null);

  // Google Translate position manager
  useEffect(() => {
    const el = document.getElementById('google_translate_element');
    if (!el) return;
    if (isMobileMenuOpen && drawerLangRef.current) {
      drawerLangRef.current.appendChild(el);
    } else if (headerLangRef.current) {
      headerLangRef.current.appendChild(el);
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,hi,bn,te,mr,ta,gu,kn,or,ml,pa,ur,as,bho,brx,doi,gom,mai,mni,lus,sa,sat,ne,sd,ks',
          autoDisplay: false
        }, 'google_translate_element');
      };

      const addScript = document.createElement('script');
      addScript.setAttribute('src', 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
      addScript.setAttribute('id', 'google-translate-script');
      addScript.async = true;
      document.body.appendChild(addScript);
    }
  }, []);

  return (
    <>
      {/* Hidden container for Google Translate element */}
      <div className="hidden">
        <div id="google_translate_element" className="flex items-center h-8 scale-90 md:scale-100" />
      </div>

      <nav className="sticky top-0 z-40 bg-[#1A365D] text-white border-b border-sky-900 shadow-sm animate-in fade-in duration-200 h-16 flex items-center shrink-0">
        <div className="w-full px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="flex items-center space-x-2">
              <img src={medicalLogo} alt="Logo" className="w-9 h-9 md:w-11 md:h-11 object-contain rounded-md" />
              <span className="font-sans font-bold tracking-tight text-base md:text-lg text-white">ArogyaFlow</span>
              <span className="ml-2 bg-white/15 border border-white/25 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md hidden sm:inline-block">
                Driver
              </span>
            </div>
            <div className="h-6 w-[1px] bg-sky-800 hidden sm:block" />
            <div className="flex items-center space-x-2 hidden md:flex">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-md bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-md h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              <span className="font-mono text-xs tracking-wider text-emerald-400 font-semibold uppercase">
                DISPATCH GRID ACTIVE
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Language Selector Container */}
            <div className="flex items-center space-x-1 text-slate-300 hidden md:flex">
              <span className="text-[10px] uppercase tracking-widest text-[#718096] font-bold hidden sm:inline">Language:</span>
              <div ref={headerLangRef} className="flex items-center h-8" />
            </div>

            {/* User Info & Logout Button (Desktop) */}
            {user && (
              <div className="flex items-center space-x-2 md:space-x-3 border-l border-sky-800 pl-2 md:pl-4 hidden md:flex">
                <div className="flex flex-col text-right">
                  <span className="text-[11px] font-bold text-white leading-none">{user.name}</span>
                  <span className="text-[9px] text-sky-300 font-semibold uppercase tracking-wider leading-none mt-1">{user.role}</span>
                </div>
                <button
                  onClick={logout}
                  className="bg-sky-800 hover:bg-[#E53E3E] text-white p-1.5 md:p-2 rounded-md transition-colors cursor-pointer flex items-center justify-center border border-sky-700"
                  title="Log Out Session"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                </button>
              </div>
            )}

            {/* Hamburger Button (three bar menu) on top right for smaller screens */}
            {user && (
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden bg-sky-800 hover:bg-sky-700 text-white p-2 rounded-md transition-colors cursor-pointer flex items-center justify-center border border-sky-700 shadow-sm shrink-0"
                title="Open Navigation Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Slide-over Drawer for mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end" role="dialog" aria-modal="true">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity cursor-pointer" 
          />

          {/* Drawer Panel */}
          <div className="relative w-screen max-w-xs bg-[#1A365D] border-l border-sky-800 text-white shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-sky-900 flex justify-between items-center bg-sky-950 shrink-0">
              <span className="font-bold text-xs tracking-wider uppercase">Navigation Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white hover:text-sky-300 text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 flex-1 flex flex-col space-y-5">
              {/* User Info card */}
              {user && (
                <div className="bg-sky-950/60 border border-sky-800 rounded-lg p-3 flex flex-col space-y-1">
                  <span className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Logged In As</span>
                  <span className="font-bold text-sm leading-tight">{user.name}</span>
                  <span className="text-[9px] text-sky-300 font-bold uppercase tracking-wider leading-none mt-1">{user.role}</span>
                </div>
              )}

              {/* Language Selector Area */}
              <div className="space-y-2 border-t border-sky-900/80 pt-3.5">
                <h3 className="text-[10px] uppercase tracking-widest text-sky-300 font-bold">Select Language</h3>
                <div ref={drawerLangRef} className="w-full flex items-center justify-center min-h-[40px] bg-sky-950 rounded-lg p-2 border border-sky-800 overflow-hidden" />
              </div>

              {/* Log Out Button */}
              {user && (
                <div className="pt-4 border-t border-sky-900 mt-auto shrink-0">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full bg-rose-650 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition-colors shadow flex items-center justify-center space-x-2 border border-rose-500 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
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
