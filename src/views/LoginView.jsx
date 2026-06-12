import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { QueueContext } from '../context/QueueContext';
import medicalLogo from '../assets/ArogyaFlow_Medical_Logo_Gradient.jpg-removebg-preview.png';

export default function LoginView() {
  const { login, signup, dbConnected } = useContext(AuthContext);
  const { checkInPatient } = useContext(QueueContext);

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roleType, setRoleType] = useState('patient'); // patient | doctor | pharmacy | driver

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignup) {
        if (!name.trim()) throw new Error('Please enter your name.');
        console.log('Submit registered clicked - Registering user:', email.trim(), name.trim(), roleType);
        const newUser = await signup(email.trim(), password, name.trim(), roleType);
        console.log('User signup context action completed. Returned user object:', newUser);
        
        // If the registered user is a patient, automatically check them in!
        if (roleType === 'patient' && newUser) {
          console.log('Auto-checking in patient:', newUser.name, 'with ID:', newUser.id);
          try {
            await checkInPatient({
              id: newUser.id,
              name: newUser.name,
              age: 30, // default
              bloodGroup: 'O+', // default
              visitReason: 'General Intake Checkup' // default
            });
            console.log('Auto check-in function executed successfully.');
          } catch (checkInErr) {
            console.error('Auto check-in failed during signup:', checkInErr);
          }
        }
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      console.error('Auth error:', err);
      const isRateLimit = err.message && (err.message.toLowerCase().includes('rate limit') || err.message.toLowerCase().includes('too many requests'));
      const isEmailConfirmRequired = err.message && err.message.startsWith('Registration successful!');
      
      if (isEmailConfirmRequired) {
        // This is actually a success - show green message and switch to login
        setSuccessMsg(err.message);
        setIsSignup(false);
        setPassword('');
      } else if (isRateLimit) {
        setErrorMsg('Supabase rate limit exceeded. Please wait a few minutes, manually create a user in your Supabase Dashboard, or click the "Force Offline Sandbox" button to test locally.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 md:p-10 -mx-4 md:-mx-6 -my-4 md:-my-6">
      {/* Login Card Wrapper */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md md:max-w-4xl w-full overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
        
        {/* Left Visual Banner Panel */}
        <div className="bg-[#1A365D] text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden hidden md:flex">
          {/* Subtle Abstract Gradients */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-sky-600 rounded-full opacity-20 filter blur-xl" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-500 rounded-full opacity-10 filter blur-xl" />

          {/* Logo / Title Header */}
          <div className="relative z-10 flex items-center space-x-2">
            <span className="text-2xl">🛡️</span>
            <div>
              <span className="font-sans font-bold tracking-tight text-xl block leading-none">ArogyaFlow</span>
              <span className="text-[10px] text-sky-200 uppercase tracking-widest font-semibold mt-1.5 block">National Health Grid</span>
            </div>
          </div>

          {/* Heartbeat SVG Wave */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center py-6">
            <svg className="w-48 h-20 text-sky-400/80 animate-pulse" viewBox="0 0 200 80" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M 0 40 L 40 40 L 50 25 L 60 55 L 70 30 L 80 50 L 90 40 L 130 40 L 140 10 L 150 70 L 160 30 L 170 50 L 180 40 L 200 40" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] text-sky-300 font-mono tracking-widest uppercase mt-4 animate-pulse">Telemetry Stream Active</span>
          </div>

          {/* Message Core */}
          <div className="relative z-10 my-4 space-y-4">
            <h2 className="text-xl font-extrabold leading-tight">
              Unified Clinical Control Network
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              Seamlessly linking patients, doctors, pharmacy administrators, and ambulance dispatch teams in real time.
            </p>
          </div>

          {/* Footer Sync Status Badge */}
          <div className="relative z-10 pt-4 flex flex-col space-y-2 border-t border-sky-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-md opacity-75 ${
                    dbConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  <span className={`relative inline-flex rounded-md h-2 w-2 ${
                    dbConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-300">
                  {dbConnected ? 'Supabase Live Connected' : 'Offline Sandbox Session'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400">v2.0.1</span>
            </div>

            {/* Sandbox Manual Override Toggle */}
            <div className="flex justify-between items-center bg-sky-950/40 p-2 rounded-lg border border-sky-900/60 mt-1">
              <span className="text-[9px] text-sky-200 font-semibold uppercase tracking-wider">
                Mode Override:
              </span>
              {localStorage.getItem('aarogyasetu_force_sandbox') === 'true' ? (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('aarogyasetu_force_sandbox');
                    window.location.reload();
                  }}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[8px] uppercase tracking-wider px-2.5 py-1 rounded transition-colors cursor-pointer"
                >
                  Go Live (Supabase)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('aarogyasetu_force_sandbox', 'true');
                    window.location.reload();
                  }}
                  className="bg-amber-700 hover:bg-amber-600 text-white font-bold text-[8px] uppercase tracking-wider px-2.5 py-1 rounded transition-colors cursor-pointer"
                >
                  Force Offline Sandbox
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Form Input Panel */}
        <div className="p-6 md:p-12 flex flex-col justify-between bg-white relative">
          
          {/* Loading Spinner Screen */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#319795] border-t-transparent mb-3" />
              <p className="text-xs font-semibold text-[#1A365D] uppercase tracking-wider">
                {isSignup ? 'Registering Account...' : 'Authenticating...'}
              </p>
            </div>
          )}

          <div>
            {/* Logo on White Background (Seamless Blend) */}
            <div className="flex items-center space-x-4 mb-6 border-b border-slate-100 pb-5">
              <img src={medicalLogo} alt="Logo" className="w-24 h-24 object-contain" />
              <div>
                <span className="font-sans font-bold tracking-tight text-3xl text-slate-800 block leading-none">ArogyaFlow</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1.5 block">National Health Grid</span>
              </div>
            </div>

            {/* Header Description Toggle */}
            <div className="flex justify-between items-baseline mb-6">
              <h1 className="text-xs font-bold text-[#718096] uppercase tracking-widest">
                {isSignup ? 'Register Portal Account' : 'Portal Access Log In'}
              </h1>
            </div>

            {/* Error Notification Alert */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3.5 mb-5 flex items-start space-x-2 animate-shake">
                <span className="text-base leading-none">⚠️</span>
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Success Notification Alert */}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg p-3.5 mb-5 flex items-start space-x-2">
                <span className="text-base leading-none">✅</span>
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Core Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {isSignup && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ramesh Malhotra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE]"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@arogyaflow.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                  Security Password
                </label>
                <input
                  type="password"
                  required
                  minLength={isSignup ? 6 : 1}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE]"
                />
              </div>

              {isSignup && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                    Select Account Role
                  </label>
                  <select
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value)}
                    className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE] cursor-pointer uppercase tracking-wider"
                  >
                    <option value="patient">Patient Portal</option>
                    <option value="doctor">Medical Officer (Doctor)</option>
                    <option value="driver">Ambulance Driver</option>
                    <option value="pharmacy">Pharmacy Administrator</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#1A365D] hover:bg-[#2B6CB0] text-white font-bold py-3.5 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer mt-4"
              >
                {isSignup ? 'Register and Log In →' : 'Authorize & Enter Portal →'}
              </button>
            </form>
          </div>

          {/* Toggle Login Mode Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              {isSignup ? 'Already registered for a portal?' : 'New Patient or responding staff?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-[#319795] font-bold uppercase tracking-wider hover:underline hover:text-[#2B6CB0] ml-1.5 cursor-pointer"
              >
                {isSignup ? 'Log In here' : 'Register Account'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
