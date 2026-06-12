import React, { useContext, useState, useEffect } from 'react';
import { QueueContext } from '../context/QueueContext';
import { EmergencyContext } from '../context/EmergencyContext';
import { AuthContext } from '../context/AuthContext';
import DataField from '../components/DataField';
import ProgressRing from '../components/ProgressRing';
import { generatePrescriptionPdf } from '../utils/prescriptionPdf';

export default function ViewAPatient() {
  const { queueSnapshot, privacyGranted, togglePrivacy, checkInPatient, updatePatientProfile } = useContext(QueueContext);
  const { startSOS, sosState } = useContext(EmergencyContext);
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('general');
  const [sosLoading, setSosLoading] = useState(false);
  const [sosStatusMsg, setSosStatusMsg] = useState('');

  // Slide-over Drawer & Profile edit states
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [editAge, setEditAge] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('O+');
  const [editDOB, setEditDOB] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editKnownAllergies, setEditKnownAllergies] = useState('');
  const [editInsuranceID, setEditInsuranceID] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Form states for checking in
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [visitReason, setVisitReason] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInError, setCheckInError] = useState('');

  // Try to find the patient record that matches the user's ID
  const patientData = queueSnapshot.docs.find(doc => doc.id === user?.id)?.data();

  // Calculate real queue position and patients ahead
  const waitingPatients = queueSnapshot.docs.map(d => d.data()).filter(p => p.status === 'waiting' || p.status === 'in-progress');
  const myQueueIndex = patientData ? waitingPatients.findIndex(p => p.id === patientData.id) : -1;
  const queuePosition = myQueueIndex >= 0 ? myQueueIndex + 1 : '—';
  const patientsAhead = myQueueIndex >= 0 ? myQueueIndex : '—';

  const handleSOS = async () => {
    if (sosLoading || sosState !== 'inactive') return;
    setSosLoading(true);
    setSosStatusMsg('📍 Acquiring your GPS location...');

    let lat = null;
    let lng = null;
    let locationStr = 'Location unavailable';

    try {
      // Step 1: Get real GPS from browser
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      lat = position.coords.latitude;
      lng = position.coords.longitude;
      setSosStatusMsg('🗺️ Resolving address...');

      // Step 2: Reverse geocode via Nominatim (free, no API key)
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        const parts = [
          addr.road || addr.pedestrian || addr.footway,
          addr.suburb || addr.neighbourhood || addr.quarter,
          addr.city || addr.town || addr.village || addr.county,
          addr.state,
        ].filter(Boolean);
        locationStr = parts.join(', ') || geoData.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      } catch (geoErr) {
        locationStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
    } catch (locErr) {
      console.warn('GPS failed:', locErr.message);
      setSosStatusMsg('⚠️ GPS denied — trying IP location...');
      // Fallback: IP-based geolocation (city-level accuracy)
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        if (ipData?.latitude && ipData?.longitude) {
          lat = ipData.latitude;
          lng = ipData.longitude;
          locationStr = `${ipData.city || ''}, ${ipData.region || ''}, ${ipData.country_name || ''} (approx.)`.replace(/^,\s*/, '').replace(/,\s*,/g, ',');
          setSosStatusMsg('📍 Approximate location acquired...');
        } else {
          locationStr = 'Location unavailable';
        }
      } catch {
        locationStr = 'Location unavailable';
      }
    }

    setSosStatusMsg('🚨 Activating emergency SOS...');

    try {
      await startSOS({
        name: user?.name || patientData?.name || 'Emergency Patient',
        id: user?.id || patientData?.id || 'Unknown',
        symptom: patientData?.visitReason || 'Medical Emergency',
        location: locationStr,
        lat,
        lng,
      });
    } catch (err) {
      console.error('SOS trigger failed:', err);
    } finally {
      setSosLoading(false);
      setSosStatusMsg('');
    }
  };

  // Sync profile data to edit states
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
      setSaveSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Save profile failed:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!patientData) {
    const handleCheckInSubmit = async (e) => {
      e.preventDefault();
      if (!age || !visitReason.trim()) {
        setCheckInError('Please fill in all details.');
        return;
      }
      setCheckInLoading(true);
      setCheckInError('');
      try {
        await checkInPatient({
          id: user.id,
          name: user.name,
          age,
          bloodGroup,
          visitReason: visitReason.trim()
        });
      } catch (err) {
        setCheckInError(err.message || 'Failed to check in. Please try again.');
      } finally {
        setCheckInLoading(false);
      }
    };

    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-[#1A365D] text-white p-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-600 rounded-full opacity-20 filter blur-lg" />
          <h2 className="text-lg font-bold tracking-tight mb-1 text-white">Clinical Queue Check-In</h2>
          <p className="text-xs text-sky-200">Register into the clinic queue floor and obtain your active ticket token</p>
        </div>

        <div className="p-6">
          {checkInError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3.5 mb-4 flex items-start space-x-2">
              <span className="text-sm">⚠️</span>
              <span className="font-semibold">{checkInError}</span>
            </div>
          )}

          <form onSubmit={handleCheckInSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                disabled
                value={user?.name || ''}
                className="w-full border border-gray-250 bg-gray-100 rounded-md px-3.5 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 28"
                  className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE] cursor-pointer"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                Reason for Visit
              </label>
              <textarea
                required
                rows="3"
                value={visitReason}
                onChange={(e) => setVisitReason(e.target.value)}
                placeholder="Briefly describe your symptoms (e.g. routine cardiac checkup, dry cough...)"
                className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={checkInLoading}
              className="w-full bg-[#1A365D] hover:bg-[#2B6CB0] text-white font-bold py-3.5 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer flex items-center justify-center space-x-2"
            >
              {checkInLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  <span>Checking in...</span>
                </>
              ) : (
                <span>Check In & Join Queue →</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const steps = [
    { label: 'QR Check-In', index: 0 },
    { label: 'Token Issued', index: 1 },
    { label: 'In Queue', index: 2 },
    { label: 'In Consultation', index: 3 },
    { label: 'Pharmacy', index: 4 },
    { label: 'Discharged', index: 5 }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Sticky Status Bar */}
      <div className="sticky top-16 z-30 bg-white border border-gray-100 rounded-lg shadow-sm p-4 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-[#718096]">Active Token</span>
            <span className="font-mono text-2xl font-bold text-[#3182CE]">{patientData.token}</span>
          </div>
          <div className="h-8 w-[1px] bg-gray-200" />
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#718096]">Queue Position</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-lg font-bold text-[#1A365D]">{queuePosition}{typeof queuePosition === 'number' ? (queuePosition === 1 ? 'st' : queuePosition === 2 ? 'nd' : queuePosition === 3 ? 'rd' : 'th') + ' in Line' : ''}</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-md bg-[#319795] opacity-75"></span>
                <span className="relative inline-flex rounded-md h-2.5 w-2.5 bg-[#319795]"></span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 md:space-x-6">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest text-[#718096] block">Est. Wait Time</span>
            <span className="font-mono text-lg font-bold text-[#1A365D]">{patientData.waitDuration} mins</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest text-[#718096] block">Patients Ahead</span>
            <span className="font-mono text-lg font-bold text-[#1A365D]">{patientsAhead}</span>
          </div>

          <div className="h-8 w-[1px] bg-gray-200" />

          {/* Hamburger Menu / Profile Trigger */}
          <button
            onClick={() => setIsProfileDrawerOpen(true)}
            className="bg-[#1A365D] hover:bg-[#2B6CB0] text-white p-2 md:p-2.5 rounded-md transition-colors cursor-pointer flex items-center justify-center border border-sky-800 shadow-sm shrink-0"
            title="Open Profile Drawer"
          >
            <span className="text-xs mr-2 font-bold uppercase tracking-wider hidden sm:inline">Profile</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Section 1 - Journey Timeline (Full-Width) */}
        <div className="col-span-12 bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="text-xs uppercase tracking-widest text-[#718096] font-bold mb-6">Patient Transit Timeline</h2>
          <div className="relative flex justify-between items-center w-full">
            <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 -z-10" />
            <div
              className="absolute top-4 left-0 h-1 bg-[#319795] transition-all duration-500 ease-out -z-10"
              style={{ width: `${(patientData.timelineStep / (steps.length - 1)) * 100}%` }}
            />

            {steps.map((step, idx) => {
              const isActive = step.index === patientData.timelineStep;
              const isCompleted = step.index < patientData.timelineStep;

              return (
                <div key={step.label} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-9 h-9 rounded-md flex items-center justify-center border-2 text-sm font-semibold transition-colors duration-300 ${
                      isActive
                        ? 'bg-[#319795] border-[#319795] text-white'
                        : isCompleted
                        ? 'bg-[#319795] border-[#319795] text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{step.index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-[10px] md:text-xs text-center font-medium uppercase tracking-wider ${
                      isActive
                        ? 'text-[#319795] font-bold block'
                        : isCompleted
                        ? 'line-through text-[#718096] hidden sm:block'
                        : 'text-gray-400 hidden sm:block'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2 - Medical Vault (Tabbed) */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 pb-4 mb-4">
            <h2 className="text-xs uppercase tracking-widest text-[#718096] font-bold">Secure Medical Vault</h2>
            <button
              onClick={() => togglePrivacy(patientData.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
                privacyGranted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-[#1A365D] hover:bg-[#2B6CB0] text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                {privacyGranted ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h16.5a1.5 1.5 0 001.5-1.5V10.5a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 10.5v9.75a1.5 1.5 0 001.5 1.5z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                )}
              </svg>
              <span>{privacyGranted ? 'Revoke Access' : 'Authorize Doctor'}</span>
            </button>
          </div>

          <div className="flex space-x-2 mb-6 border-b border-gray-100 overflow-x-auto whitespace-nowrap scrollbar-none pb-1">
            {['general', 'cardiology', 'dermatology', 'prescriptions'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all duration-300 ${
                  activeTab === tab
                    ? 'border-[#3182CE] text-[#3182CE]'
                    : 'border-transparent text-[#718096] hover:text-[#1A365D]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="transition-all duration-300">
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(patientData.medicalVault.general).map(([label, val]) => (
                  <DataField key={label} label={label} value={val} isLocked={false} />
                ))}
              </div>
            )}

            {activeTab === 'cardiology' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(patientData.medicalVault.cardiology).map(([label, val]) => (
                  <DataField key={label} label={label} value={val} isLocked={false} />
                ))}
              </div>
            )}

            {activeTab === 'dermatology' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(patientData.medicalVault.dermatology).map(([label, val]) => (
                  <DataField key={label} label={label} value={val} isLocked={false} />
                ))}
              </div>
            )}

            {activeTab === 'prescriptions' && (
              <div className="space-y-4">
                {/* PDF Download Action */}
                {patientData.medicalVault.prescriptions.length > 0 && (() => {
                  const dates = [...new Set(patientData.medicalVault.prescriptions.map(rx => rx.date))];
                  const latestDate = dates[0];
                  const latestRxs = patientData.medicalVault.prescriptions.filter(rx => rx.date === latestDate);
                  
                  return (
                    <div className="bg-sky-50 border border-sky-100 rounded-lg p-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h4 className="text-xs uppercase tracking-widest text-[#1A365D] font-bold">Latest Prescription PDF</h4>
                        <p className="text-xs text-slate-600 mt-1">
                          Prescribed by <strong>{latestRxs[0]?.doctor || patientData.doctor}</strong> on <strong>{latestDate}</strong> ({latestRxs.length} medicine{latestRxs.length > 1 ? 's' : ''})
                        </p>
                      </div>
                      <button
                        onClick={() => generatePrescriptionPdf(patientData, latestRxs, latestRxs[0]?.doctor || patientData.doctor)}
                        className="bg-[#1A365D] hover:bg-[#2B6CB0] text-white font-bold py-2 px-4 rounded-md text-xs uppercase tracking-wider transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm shrink-0"
                      >
                        <span>📄</span>
                        <span>Download Prescription PDF</span>
                      </button>
                    </div>
                  );
                })()}

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 text-xs uppercase tracking-widest text-[#718096]">Date</th>
                        <th className="py-2 text-xs uppercase tracking-widest text-[#718096]">Physician</th>
                        <th className="py-2 text-xs uppercase tracking-widest text-[#718096]">Rx Details</th>
                        <th className="py-2 text-xs uppercase tracking-widest text-[#718096] text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientData.medicalVault.prescriptions.map((rx, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 text-slate-800 font-medium">{rx.date}</td>
                          <td className="py-3 text-slate-800 font-medium">{rx.doctor}</td>
                          <td className="py-3 font-semibold text-[#1A365D] notranslate" translate="no">
                            {`${rx.medication} (${rx.dosage})`}
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                                rx.status === 'Filled'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}
                            >
                              {rx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3 - Privacy Handshake Panel */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center">
          <h2 className="text-xs uppercase tracking-widest text-[#718096] font-bold mb-1">Doctor Access QR</h2>
          <p className="text-xs text-[#718096] mb-4 leading-relaxed">
            Show this to your doctor. They scan it to unlock your full medical record.
          </p>

          {/* Large QR Code */}
          <div className="relative mb-4 p-3 bg-white border-2 border-[#1A365D] rounded-xl shadow-md">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=arogyaflow:consent:${patientData.id}`}
              alt="Doctor Access QR"
              className="w-44 h-44 notranslate"
              translate="no"
            />
            {/* ArogyaFlow watermark */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1A365D] text-white text-[9px] font-bold px-3 py-0.5 rounded-full tracking-widest uppercase">
              ArogyaFlow
            </div>
          </div>

          {/* Patient ID chip */}
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 w-full">
            <div className="text-[10px] text-[#718096] uppercase tracking-wider mb-0.5">Patient ID</div>
            <div className="font-mono text-xs font-bold text-[#1A365D] break-all">{patientData.id}</div>
          </div>

          {/* Status badge */}
          <div className="mt-3 w-full">
            <span className={`px-3 py-1.5 rounded-md text-xs font-bold block uppercase tracking-wider ${
              privacyGranted
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {privacyGranted ? '✅ Record Unlocked by Doctor' : '🔒 Awaiting Doctor Scan'}
            </span>
          </div>
        </div>

      </div>

      {/* Floating Emergency SOS Footer Trigger */}
      <div className="pt-6 border-t border-gray-200 flex justify-end">
        <button
          onClick={handleSOS}
          disabled={sosLoading || sosState !== 'inactive'}
          className={`font-bold py-3.5 px-8 rounded-md transition-colors shadow-sm flex items-center space-x-3 cursor-pointer ${
            sosState !== 'inactive'
              ? 'bg-amber-500 text-white cursor-not-allowed'
              : 'bg-[#E53E3E] hover:bg-red-700 text-white'
          }`}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-md bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-md h-3 w-3 bg-white"></span>
          </span>
          <span className="tracking-wide text-sm uppercase">
            {sosLoading ? 'Activating SOS...' : sosState !== 'inactive' ? '🚨 SOS Active' : '⚠ Emergency SOS'}
          </span>
        </button>
      </div>

      {/* Slide-over Profile Settings & Info Drawer */}
      {isProfileDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop overlay */}
            <div 
              onClick={() => setIsProfileDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity cursor-pointer" 
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md transform bg-white shadow-2xl transition-all duration-300 ease-in-out flex flex-col h-full animate-in slide-in-from-right">
                
                {/* Drawer Header */}
                <div className="bg-[#1A365D] px-6 py-5 flex justify-between items-center text-white shrink-0">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xl">👤</span>
                    <div>
                      <h2 className="font-bold text-sm tracking-wide uppercase" id="slide-over-title">
                        Patient Profile Command
                      </h2>
                      <p className="text-[10px] text-sky-200 uppercase tracking-wider">Configure your clinical records</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsProfileDrawerOpen(false)}
                    className="text-white/80 hover:text-white text-lg font-bold transition-colors w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full"
                  >
                    ✕
                  </button>
                </div>

                {/* Drawer Body Scroll */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Status Summary & QR */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col items-center text-center shadow-sm">
                    <div className="relative mb-3 p-2.5 bg-white border border-[#1A365D] rounded-lg shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=8&data=arogyaflow:consent:${patientData.id}`}
                        alt="Profile QR Code"
                        className="w-32 h-32 notranslate"
                        translate="no"
                      />
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#1A365D] text-white text-[8px] font-bold px-2 py-0.5 rounded-full tracking-widest uppercase">
                        ArogyaFlow
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">{patientData.name}</h3>
                    <p className="font-mono text-xs text-sky-700 font-semibold mt-0.5">{patientData.token}</p>
                    
                    <div className="mt-4 w-full">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold block uppercase tracking-wider border ${
                        privacyGranted
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}>
                        {privacyGranted ? '✅ Doctor Consent Active' : '🔒 Awaiting Doctor QR Scan'}
                      </span>
                    </div>
                  </div>

                  {/* Profile Edit Form */}
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <h3 className="text-xs uppercase tracking-widest text-[#718096] font-bold border-b border-gray-150 pb-2">
                      Edit Personal & Medical Info
                    </h3>

                    {saveSuccessMsg && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-2.5 rounded-md flex items-center space-x-2">
                        <span>✅</span>
                        <span>{saveSuccessMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                          Age (Years)
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="120"
                          value={editAge}
                          onChange={(e) => setEditAge(e.target.value)}
                          className="w-full border border-gray-250 bg-[#F7FAFC] rounded-md px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                          Blood Group
                        </label>
                        <select
                          value={editBloodGroup}
                          onChange={(e) => setEditBloodGroup(e.target.value)}
                          className="w-full border border-gray-250 bg-[#F7FAFC] rounded-md px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE] cursor-pointer"
                        >
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                        Date of Birth (DOB)
                      </label>
                      <input
                        type="date"
                        value={editDOB}
                        onChange={(e) => setEditDOB(e.target.value)}
                        className="w-full border border-gray-250 bg-[#F7FAFC] rounded-md px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                        Known Allergies
                      </label>
                      <input
                        type="text"
                        value={editKnownAllergies}
                        onChange={(e) => setEditKnownAllergies(e.target.value)}
                        placeholder="e.g. Penicillin, Pollen"
                        className="w-full border border-gray-250 bg-[#F7FAFC] rounded-md px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                        Emergency Contact
                      </label>
                      <input
                        type="text"
                        value={editEmergencyContact}
                        onChange={(e) => setEditEmergencyContact(e.target.value)}
                        placeholder="e.g. Spouse (+91 XXXXX XXXXX)"
                        className="w-full border border-gray-250 bg-[#F7FAFC] rounded-md px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[#718096] font-bold block mb-1">
                        Insurance ID
                      </label>
                      <input
                        type="text"
                        value={editInsuranceID}
                        onChange={(e) => setEditInsuranceID(e.target.value)}
                        placeholder="e.g. INSR-12345"
                        className="w-full border border-gray-250 bg-[#F7FAFC] rounded-md px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#3182CE]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="w-full bg-[#1A365D] hover:bg-[#2B6CB0] text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {isSavingProfile ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <span>Save Profile Updates →</span>
                      )}
                    </button>
                  </form>

                  {/* Actions Area */}
                  <div className="space-y-3 pt-4 border-t border-gray-150">
                    <h3 className="text-xs uppercase tracking-widest text-[#718096] font-bold mb-2">
                      Access & Emergency Settings
                    </h3>
                    
                    <button
                      type="button"
                      onClick={() => togglePrivacy(patientData.id)}
                      className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border cursor-pointer ${
                        privacyGranted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        {privacyGranted ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h16.5a1.5 1.5 0 001.5-1.5V10.5a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 10.5v9.75a1.5 1.5 0 001.5 1.5z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        )}
                      </svg>
                      <span>{privacyGranted ? 'Revoke Doctor Consent' : 'Grant Doctor Consent'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDrawerOpen(false);
                        handleSOS();
                      }}
                      disabled={sosLoading || sosState !== 'inactive'}
                      className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer ${
                        sosState !== 'inactive'
                          ? 'bg-amber-500 text-white cursor-not-allowed'
                          : 'bg-[#E53E3E] hover:bg-red-700 text-white'
                      }`}
                    >
                      <span>🚨</span>
                      <span>{sosState !== 'inactive' ? 'SOS Mode Active' : 'Trigger Emergency SOS'}</span>
                    </button>
                  </div>
                </div>

                {/* Footer details */}
                <div className="p-4 bg-slate-50 border-t border-gray-100 text-center shrink-0">
                  <p className="text-[9px] font-mono text-[#718096] uppercase tracking-wider">
                    ArogyaFlow Privacy Compliance Vault • HIPAA Secured
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
