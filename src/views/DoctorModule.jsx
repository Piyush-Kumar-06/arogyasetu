import React, { useContext, useState, useEffect, useRef } from 'react';
import { QueueContext } from '../context/QueueContext';
import DataField from '../components/DataField';
import jsQR from 'jsqr';

export default function ViewBDoctor() {
  const { queueSnapshot, callNextPatient, dispatchPrescription, privacyGranted, togglePrivacy } = useContext(QueueContext);
  const [selectedPatientId, setSelectedPatientId] = useState('P-42');
  const [activeHistoryTab, setActiveHistoryTab] = useState('general');

  // Form states for prescription
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('QD');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [rxSuccessMsg, setRxSuccessMsg] = useState('');

  // Autocomplete and strength state
  const [suggestions, setSuggestions] = useState([]);
  const [strengths, setStrengths] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isCustomDosage, setIsCustomDosage] = useState(false);

  // Webcam QR scanner states & refs
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Dynamically generate scan confirmation tone via AudioContext
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1200Hz high pitch beep
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // 150ms beep
    } catch (err) {
      console.warn('Audio beep generation failed:', err);
    }
  };

  // Webcam QR scanning controller
  useEffect(() => {
    let animationFrameId;
    let active = true;

    const startCamera = async () => {
      if (!isScanning) return;
      try {
        setScanError('');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(err => {
            console.error('Video play error:', err);
          });
          animationFrameId = requestAnimationFrame(scanLoop);
        }
      } catch (err) {
        console.error('Camera access failed:', err);
        setScanError('Failed to access camera. Please ensure permissions are granted or use simulation bypass.');
      }
    };

    const scanLoop = () => {
      if (!active || !isScanning) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          console.log('Found QR code:', code.data);
          if (code.data === `arogyaflow:consent:${selectedPatientId}`) {
            playBeep();
            if (!privacyGranted) {
              togglePrivacy();
            }
            setIsScanning(false);
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanLoop);
    };

    if (isScanning) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
      stopCamera();
    };
  }, [isScanning, selectedPatientId, privacyGranted]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Clinical Tables Auto-Suggest Effect
  useEffect(() => {
    if (medication.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setIsLoadingSuggestions(true);
      fetch(
        `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(
          medication
        )}&ef=STRENGTHS_AND_FORMS`,
        { signal: controller.signal }
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data[1]) {
            const names = data[1];
            const forms = data[2]?.STRENGTHS_AND_FORMS || [];
            
            // Map each drug name to its strengths list
            const combined = names.map((name, index) => ({
              name,
              strengths: forms[index] || []
            }));
            
            setSuggestions(combined);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
          }
          setIsLoadingSuggestions(false);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setIsLoadingSuggestions(false);
          }
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [medication]);

  const activePatientDoc = queueSnapshot.docs.find(doc => doc.id === selectedPatientId);
  const activePatient = activePatientDoc ? activePatientDoc.data() : null;

  const handleCallNext = () => {
    const nextPatient = queueSnapshot.docs.find(doc => doc.data().status === 'waiting');
    if (nextPatient) {
      callNextPatient(nextPatient.id, nextPatient.data().token, 'Dr. R. Malhotra');
      setSelectedPatientId(nextPatient.id);
      setRxSuccessMsg('');
    }
  };

  const handleRoutePharmacy = (e) => {
    e.preventDefault();
    if (!medication || !dosage) return;

    dispatchPrescription(selectedPatientId, medication, dosage, frequency);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setRxSuccessMsg(`Prescription dispatched to Pharmacy at ${timeStr}`);

    // Clear form
    setMedication('');
    setDosage('');
    setDuration('');
    setNotes('');
    setStrengths([]);
    setIsCustomDosage(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-80px)] md:overflow-hidden -mx-4 md:-mx-6 -mb-4 md:-mb-6 bg-slate-50 border-t border-gray-100">
      {/* Left Panel: Patient Queue */}
      <div className="w-full md:w-[340px] flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col justify-between h-[320px] md:h-full">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50">
            <h2 className="text-xs uppercase tracking-widest text-[#718096] font-bold">Patient Queue</h2>
            <span className="font-mono text-xs bg-[#1A365D] text-white px-2 py-0.5 rounded-md font-semibold">
              {queueSnapshot.docs.filter(doc => doc.data().status === 'waiting').length} Waiting
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {queueSnapshot.docs.map(doc => {
              const p = doc.data();
              const isSelected = p.id === selectedPatientId;
              const isCurrentSession = p.status === 'in-progress';

              let dotColor = 'bg-[#319795]'; // green < 10min
              if (p.waitDuration >= 20) dotColor = 'bg-[#E53E3E]'; // red
              else if (p.waitDuration >= 10) dotColor = 'bg-amber-500'; // amber

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPatientId(p.id);
                    setRxSuccessMsg('');
                  }}
                  className={`p-4 cursor-pointer transition-all duration-200 border-l-4 ${
                    isSelected
                      ? 'bg-sky-50 border-[#3182CE]'
                      : 'hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-sm font-bold text-[#1A365D]">{p.token}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs text-[#718096]">{p.waitDuration}m wait</span>
                      <span className={`w-2.5 h-2.5 rounded-md ${dotColor}`} />
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                  <div className="text-xs text-[#718096] truncate mt-1">{p.visitReason}</div>

                  {isCurrentSession && (
                    <span className="inline-block mt-2 bg-[#319795] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                      In consultation
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Call Next Button Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex flex-col space-y-3">
          <button
            onClick={handleCallNext}
            className="w-full bg-[#1A365D] hover:bg-[#2B6CB0] text-white font-semibold py-3 rounded-md transition-colors text-sm uppercase tracking-wider"
          >
            Call Next Patient
          </button>
          <a
            href="#queue-tower"
            className="text-xs text-[#319795] font-semibold text-center hover:underline cursor-pointer uppercase tracking-wider"
          >
            View Full Queue Floor
          </a>
        </div>
      </div>

      {/* Right Panel: Patient Workspace */}
      <div className="flex-1 overflow-y-auto p-6">
        {!activePatient ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="max-w-sm">
              <p className="text-[#718096] text-sm uppercase tracking-widest font-semibold">
                Select a patient or call the next in queue to begin consultation.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sub-panel A: Summary Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#718096] font-semibold block mb-1">Patient Name</span>
                  <span className="font-semibold text-slate-800">{activePatient.name}</span>
                </div>
                <div className="pt-2 md:pt-0 md:pl-4">
                  <span className="text-[10px] uppercase tracking-widest text-[#718096] font-semibold block mb-1">Age / Sex</span>
                  <span className="font-mono text-sm text-[#1A365D] font-bold">{activePatient.age} Yrs / Male</span>
                </div>
                <div className="pt-2 md:pt-0 md:pl-4">
                  <span className="text-[10px] uppercase tracking-widest text-[#718096] font-semibold block mb-1">Blood Group</span>
                  <span className="font-mono text-sm text-[#1A365D] font-bold">{activePatient.bloodGroup}</span>
                </div>
                <div className="pt-2 md:pt-0 md:pl-4 col-span-2 md:col-span-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#718096] font-semibold block mb-1">Reason for Visit</span>
                  <span className="font-semibold text-slate-800 text-sm">{activePatient.visitReason}</span>
                </div>
              </div>
            </div>

            {/* Privacy Check Alert */}
            {!privacyGranted && activePatient.id === 'P-42' && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-md flex justify-between items-center">
                <div className="flex items-center space-x-3 text-amber-800 text-sm">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    <strong>Privacy Lockdown:</strong> This patient's record is locked. Scan their handshake QR code to unlock historic clinical charts.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="ml-4 bg-[#1A365D] hover:bg-[#2B6CB0] text-white font-semibold py-2 px-4 rounded-md text-xs uppercase tracking-wider transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm shrink-0"
                >
                  <span>📷</span>
                  <span>Scan QR Code</span>
                </button>
              </div>
            )}

            {/* Sub-panel B: Clinical Record & History */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h3 className="text-xs uppercase tracking-widest text-[#718096] font-bold mb-4">Patient Medical Vault (Unlocked Mirror)</h3>

              <div className="flex space-x-2 mb-4 border-b border-gray-100 overflow-x-auto whitespace-nowrap scrollbar-none pb-1">
                {['general', 'cardiology', 'dermatology', 'prescriptions'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveHistoryTab(tab)}
                    className={`py-2 px-4 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all duration-300 ${
                      activeHistoryTab === tab
                        ? 'border-[#3182CE] text-[#3182CE]'
                        : 'border-transparent text-[#718096] hover:text-[#1A365D]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div>
                {activeHistoryTab === 'general' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(activePatient.medicalVault.general).map(([label, val]) => (
                      <DataField
                        key={label}
                        label={label}
                        value={val}
                        isLocked={activePatient.id === 'P-42' ? !privacyGranted : false}
                      />
                    ))}
                  </div>
                )}

                {activeHistoryTab === 'cardiology' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(activePatient.medicalVault.cardiology).map(([label, val]) => (
                      <DataField
                        key={label}
                        label={label}
                        value={val}
                        isLocked={activePatient.id === 'P-42' ? !privacyGranted : false}
                      />
                    ))}
                  </div>
                )}

                {activeHistoryTab === 'dermatology' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(activePatient.medicalVault.dermatology).map(([label, val]) => (
                      <DataField
                        key={label}
                        label={label}
                        value={val}
                        isLocked={activePatient.id === 'P-42' ? !privacyGranted : false}
                      />
                    ))}
                  </div>
                )}

                {activeHistoryTab === 'prescriptions' && (
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
                        {activePatient.medicalVault.prescriptions.map((rx, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                            <td className="py-3 text-slate-800 font-medium">{rx.date}</td>
                            <td className="py-3 text-slate-800 font-medium">{rx.doctor}</td>
                            <td className="py-3 font-semibold text-[#1A365D] notranslate" translate="no">
                              {(activePatient.id !== 'P-42' || privacyGranted) ? `${rx.medication} (${rx.dosage})` : '•••••••• (Protected)'}
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
                )}
              </div>
            </div>

            {/* Sub-panel C: AI Diagnostic Insights */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <div className="flex items-center space-x-2 mb-4">
                <span className="font-mono text-xs uppercase tracking-widest bg-emerald-50 text-[#319795] border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                  GEMINI AI ANALYSIS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-[#718096] font-bold mb-2">Clinical Risk Flags</h4>
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 text-sm p-4 rounded-md flex items-start space-x-3 mb-4 leading-relaxed">
                    <span className="text-lg">⚠</span>
                    <span>{activePatient.aiInsights.riskFlags}</span>
                  </div>

                  <h4 className="text-xs uppercase tracking-widest text-[#718096] font-bold mb-2">Suggested Interventions</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-[#1A365D]">
                    {activePatient.aiInsights.interventions.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs uppercase tracking-widest text-[#718096] font-bold mb-2">Dietary Guidance Matrix</h4>
                  <table className="w-full text-left text-sm border border-gray-200 rounded-md overflow-hidden">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 font-mono text-xs">
                        <th className="p-2.5 text-[#319795] font-bold">✓ RECOMMENDED</th>
                        <th className="p-2.5 text-[#E53E3E] font-bold">✗ RESTRICT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activePatient.aiInsights.diet.recommended.map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-slate-700 flex items-center space-x-2 font-medium">
                            <span className="w-1.5 h-1.5 rounded-md bg-[#319795]" />
                            <span>{rec}</span>
                          </td>
                          <td className="p-2.5 text-slate-700 font-medium">
                            <div className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 rounded-md bg-[#E53E3E]" />
                              <span>{activePatient.aiInsights.diet.restrict[i]}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sub-panel D: Prescription Router */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h3 className="text-xs uppercase tracking-widest text-[#718096] font-bold mb-4">Pharmacy Prescription Router</h3>

              <form onSubmit={handleRoutePharmacy} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 relative">
                    <label className="text-[10px] uppercase tracking-widest text-[#718096] font-semibold block mb-1">Medication Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={medication}
                        onChange={(e) => setMedication(e.target.value)}
                        onFocus={() => medication.trim().length >= 2 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="e.g. Paracetamol"
                        className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#3182CE] notranslate"
                        translate="no"
                        required
                        autoComplete="off"
                      />
                      {isLoadingSuggestions && (
                        <span className="absolute right-3 top-2.5 flex h-4 w-4">
                          <span className="animate-spin rounded-md h-4 w-4 border-2 border-t-[#319795] border-gray-200" />
                        </span>
                      )}
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-md max-h-48 overflow-y-auto z-50 divide-y divide-gray-100 font-mono text-xs notranslate" translate="no">
                        {suggestions.map((item, idx) => (
                          <li
                            key={idx}
                            onClick={() => {
                              setMedication(item.name);
                              setStrengths(item.strengths);
                              if (item.strengths && item.strengths.length > 0) {
                                setDosage(item.strengths[0]);
                                setIsCustomDosage(false);
                              } else {
                                setDosage('');
                                setIsCustomDosage(true);
                              }
                              setShowSuggestions(false); // Close dropdown immediately
                            }}
                            className="p-2.5 hover:bg-sky-50 cursor-pointer text-slate-800 flex justify-between items-center notranslate"
                            translate="no"
                          >
                            <span className="font-semibold notranslate" translate="no">{item.name}</span>
                            {item.strengths.length > 0 && (
                              <span className="text-[10px] text-[#718096] uppercase tracking-wider notranslate">
                                {item.strengths.length} options
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#718096] font-semibold block mb-1">Dosage</label>
                    {strengths.length > 0 && !isCustomDosage ? (
                      <div className="flex space-x-1">
                        <select
                          value={dosage}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setIsCustomDosage(true);
                              setDosage('');
                            } else {
                              setDosage(val);
                            }
                          }}
                          className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#3182CE]"
                          required
                        >
                          {strengths.map((str, idx) => (
                            <option key={idx} value={str}>{str}</option>
                          ))}
                          <option value="custom">-- Custom --</option>
                        </select>
                      </div>
                    ) : (
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={dosage}
                          onChange={(e) => setDosage(e.target.value)}
                          placeholder="e.g. 500 mg tab"
                          className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#3182CE] pr-12"
                          required
                        />
                        {strengths.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomDosage(false);
                              setDosage(strengths[0] || '');
                            }}
                            className="absolute right-2 text-[10px] text-[#319795] font-bold uppercase tracking-wider hover:underline"
                          >
                            List
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#718096] font-semibold block mb-1">Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#3182CE]"
                    >
                      <option value="QD">Once Daily (QD)</option>
                      <option value="BID">Twice Daily (BID)</option>
                      <option value="TID">Three Times Daily (TID)</option>
                      <option value="PRN">As Needed (PRN)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#718096] font-semibold block mb-1">Duration</label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 30 Days"
                      className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#3182CE]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#718096] font-semibold block mb-1">Notes / Contraindications Check</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Take with dinner, monitor blood pressure"
                      className="w-full border border-gray-200 bg-[#F7FAFC] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#3182CE]"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex-1 mr-4">
                    {rxSuccessMsg && (
                      <div className="bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-2 rounded-md border border-emerald-100 transition-opacity">
                        ✓ {rxSuccessMsg}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="bg-[#319795] hover:bg-[#2B6CB0] text-white font-semibold py-2.5 px-6 rounded-md transition-colors text-sm uppercase tracking-wider flex-shrink-0 cursor-pointer"
                  >
                    Route to Pharmacy →
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Real QR Handshake Webcam Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#1A365D] text-white p-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📷</span>
                <div>
                  <h3 className="font-bold text-sm tracking-wide uppercase">Privacy Handshake Scanner</h3>
                  <p className="text-[10px] text-sky-200 uppercase tracking-wider">ArogyaFlow Consent Protocol</p>
                </div>
              </div>
              <button
                onClick={() => setIsScanning(false)}
                className="text-white/80 hover:text-white text-lg font-bold transition-colors w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* Camera View Area */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              
              {/* Scan Overlay UI */}
              <div className="absolute inset-0 border-[24px] border-slate-900/40 pointer-events-none flex items-center justify-center">
                <div className="relative w-44 h-44 border-2 border-emerald-400/80 rounded-lg flex items-center justify-center">
                  {/* Glowing corners */}
                  <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-4 border-l-4 border-emerald-500 rounded-tl" />
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-4 border-r-4 border-emerald-500 rounded-tr" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-4 border-l-4 border-emerald-500 rounded-bl" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-4 border-r-4 border-emerald-500 rounded-br" />
                  
                  {/* Scanning Laser Line */}
                  <div className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_8px_#34d399] animate-bounce pointer-events-none" />
                </div>
              </div>

              {scanError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 text-white">
                  <span className="text-3xl mb-2">⚠️</span>
                  <p className="text-xs font-mono text-rose-400 mb-4">{scanError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer / Fallbacks */}
            <div className="p-4 bg-slate-50 border-t border-gray-100 flex flex-col space-y-3">
              <div className="text-center">
                <p className="text-xs text-slate-500 font-medium">
                  Align patient's QR code within the green square.
                </p>
                <p className="text-[10px] font-mono text-[#1A365D] mt-1 uppercase tracking-wider">
                  Target: arogyaflow:consent:{selectedPatientId}
                </p>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => {
                    playBeep();
                    if (!privacyGranted) {
                      togglePrivacy();
                    }
                    setIsScanning(false);
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-md text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer text-center"
                >
                  ⚡ Simulate Handshake Success
                </button>
                <button
                  onClick={() => setIsScanning(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-slate-700 font-bold py-2.5 px-4 rounded-md text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
