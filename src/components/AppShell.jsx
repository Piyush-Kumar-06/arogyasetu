import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { QueueContext } from '../context/QueueContext';
import { EmergencyContext } from '../context/EmergencyContext';
import ViewCEmergencyModal from '../views/EmergencyModal';
import medicalLogo from '../assets/ArogyaFlow_Medical_Logo_Gradient.jpg-removebg-preview.png';

export default function AppShell({ children }) {
  const { role, setRole, logout, user } = useContext(AuthContext);
  const { queueSnapshot, privacyGranted, togglePrivacy, updatePatientProfile } = useContext(QueueContext);
  const { sosState } = useContext(EmergencyContext);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerLangRef = useRef(null);
  const drawerLangRef = useRef(null);

  // Patient data sync for drawer
  const patientData = queueSnapshot?.docs?.find(doc => doc.id === user?.id)?.data();
  const [editAge, setEditAge] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('O+');
  const [editDOB, setEditDOB] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editKnownAllergies, setEditKnownAllergies] = useState('');
  const [editInsuranceID, setEditInsuranceID] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  useEffect(() => {
    if (patientData) {
      setEditAge(patientData.age || '');
      setEditBloodGroup(patientData.bloodGroup || 'O+');
      setEditDOB(patientData.medicalVault?.general?.['DOB'] || '');
      setEditEmergencyContact(patientData.medicalVault?.general?.['Emergency Contact'] || '');
      setEditKnownAllergies(patientData.medicalVault?.general?.['Known Allergies'] || '');
      setEditInsuranceID(patientData.medicalVault?.general?.['Insurance ID'] || '');
    }
  }, [patientData]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSaveSuccessMsg('');
    try {
      await updatePatientProfile(patientData.id, {
        age: editAge,
        bloodGroup: editBloodGroup,
        DOB: editDOB,
        emergencyContact: editEmergencyContact,
        knownAllergies: editKnownAllergies,
        insuranceID: editInsuranceID
      });
      setSaveSuccessMsg('Updated!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Save profile failed:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

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
      {/* Hidden initial container for Google Translate element */}
      <div className="hidden">
        <div id="google_translate_element" className="flex items-center h-8 scale-90 md:scale-100" />
      </div>
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
            <div className="flex items-center space-x-1 text-slate-300 hidden md:flex">
              <span className="text-[10px] uppercase tracking-widest text-[#718096] font-bold hidden sm:inline">Language:</span>
              <div ref={headerLangRef} className="flex items-center h-8" />
            </div>

            {/* User Info & Logout Button */}
            {user && (
              <div className="flex items-center space-x-2 md:space-x-3 border-l border-sky-800 pl-2 md:pl-4 hidden md:flex">
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col">
        {sosState !== 'inactive' && <ViewCEmergencyModal />}
        {children}
      </main>

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

              {/* Profile Management Section (Only for Patient Role) */}
              {user && role === 'patient' && patientData && (
                <div className="space-y-3 border-t border-sky-900/80 pt-3.5">
                  <h3 className="text-[10px] uppercase tracking-widest text-sky-300 font-bold">Profile Details</h3>
                  
                  <div className="bg-sky-950/30 border border-sky-900 rounded-md p-2.5 text-xs space-y-1.5 font-sans">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Token Number:</span>
                      <span className="font-mono font-bold text-sky-300">{patientData.token}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Age / Sex:</span>
                      <span className="font-semibold">{patientData.age} Yrs / Male</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Blood Group:</span>
                      <span className="font-semibold text-sky-300">{patientData.bloodGroup}</span>
                    </div>
                  </div>

                  {/* Profile Edit Form */}
                  <form onSubmit={handleSaveProfile} className="space-y-3 text-left">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-slate-300 font-bold block mb-0.5">Age</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="120"
                          value={editAge}
                          onChange={(e) => setEditAge(e.target.value)}
                          className="w-full border border-sky-800 bg-sky-950 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-slate-300 font-bold block mb-0.5">Blood Group</label>
                        <select
                          value={editBloodGroup}
                          onChange={(e) => setEditBloodGroup(e.target.value)}
                          className="w-full border border-sky-800 bg-sky-950 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-400 cursor-pointer"
                        >
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-slate-300 font-bold block mb-0.5">DOB</label>
                      <input
                        type="date"
                        value={editDOB}
                        onChange={(e) => setEditDOB(e.target.value)}
                        className="w-full border border-sky-800 bg-sky-950 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-slate-300 font-bold block mb-0.5">Known Allergies</label>
                      <input
                        type="text"
                        value={editKnownAllergies}
                        onChange={(e) => setEditKnownAllergies(e.target.value)}
                        className="w-full border border-sky-800 bg-sky-950 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-slate-300 font-bold block mb-0.5">Emergency Contact</label>
                      <input
                        type="text"
                        value={editEmergencyContact}
                        onChange={(e) => setEditEmergencyContact(e.target.value)}
                        className="w-full border border-sky-800 bg-sky-950 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-slate-300 font-bold block mb-0.5">Insurance ID</label>
                      <input
                        type="text"
                        value={editInsuranceID}
                        onChange={(e) => setEditInsuranceID(e.target.value)}
                        className="w-full border border-sky-800 bg-sky-950 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="w-full bg-sky-650 hover:bg-sky-600 text-white font-bold py-2 rounded text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow"
                    >
                      {isSavingProfile ? (
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      ) : (
                        <span>Save Updates</span>
                      )}
                    </button>
                    {saveSuccessMsg && (
                      <p className="text-emerald-400 text-[10px] font-bold text-center mt-1">✓ {saveSuccessMsg}</p>
                    )}
                  </form>
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
    </div>
  );
}
