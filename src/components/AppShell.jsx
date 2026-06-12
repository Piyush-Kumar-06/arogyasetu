import React, { useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { QueueContext } from '../context/QueueContext';
import { EmergencyContext } from '../context/EmergencyContext';
import ViewCEmergencyModal from '../views/EmergencyModal';
import medicalLogo from '../assets/ArogyaFlow_Medical_Logo_Gradient.jpg-removebg-preview.png';

export default function AppShell({ children }) {
  const { role, setRole, logout, user } = useContext(AuthContext);
  const { privacyGranted, togglePrivacy } = useContext(QueueContext);
  const { sosState } = useContext(EmergencyContext);

  useEffect(() => {
    // Check if script is already added
    if (!document.getElementById('google-translate-script')) {
      // Setup global init function before adding script
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
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col">
      {/* Top Persistent Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-[#1A365D] text-white border-b border-sky-900 shadow-sm animate-in fade-in duration-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="flex items-center space-x-2">
              <img src={medicalLogo} alt="Logo" className="w-9 h-9 md:w-12 md:h-12 object-contain" />
              <span className="font-sans font-bold tracking-tight text-base md:text-lg text-white">ArogyaFlow</span>
            </div>
            <div className="h-6 w-[1px] bg-sky-800 hidden sm:block" />
            <div className="flex items-center space-x-2 hidden md:flex">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-md bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-md h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              <span className="font-mono text-xs tracking-wider text-emerald-400 font-semibold uppercase">
                ALL SYSTEMS NOMINAL
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {role === 'patient' && (
              <button
                onClick={togglePrivacy}
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                  privacyGranted
                    ? 'bg-emerald-800/40 border-emerald-400 text-emerald-300'
                    : 'bg-amber-800/40 border-amber-400 text-amber-300'
                } transition-colors cursor-pointer hidden md:block`}
              >
                Consent Sim: {privacyGranted ? 'GRANTED' : 'REVOKED'}
              </button>
            )}

            {/* Language Selector Container */}
            <div className="flex items-center space-x-1 text-slate-300">
              <span className="text-[10px] uppercase tracking-widest text-[#718096] font-bold hidden sm:inline">Language:</span>
              <div id="google_translate_element" className="flex items-center h-8 scale-90 md:scale-100" />
            </div>

            {/* User Info & Logout Button */}
            {user && (
              <div className="flex items-center space-x-2 md:space-x-3 border-l border-sky-800 pl-2 md:pl-4">
                <div className="flex flex-col text-right hidden lg:block">
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
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col">
        {sosState !== 'inactive' && <ViewCEmergencyModal />}
        {children}
      </main>
    </div>
  );
}
