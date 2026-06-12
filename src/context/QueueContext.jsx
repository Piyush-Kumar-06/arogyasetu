import React, { createContext, useReducer, useEffect, useState } from 'react';
import { supabase, checkSupabaseConnection } from '../utils/supabaseClient';

export const QueueContext = createContext();

// Initial Patient records
const INITIAL_PATIENTS = [
  {
    id: 'P-42',
    token: '#A-42',
    name: 'Aditya Sharma',
    age: 42,
    bloodGroup: 'O+',
    visitReason: 'Recurrent chest tightness and mild palpitations',
    lastVisit: '2026-03-12',
    waitDuration: 12,
    urgency: 'amber',
    status: 'waiting',
    room: 'Room 102',
    doctor: 'Dr. R. Malhotra',
    timelineStep: 2,
    medicalVault: {
      general: {
        'Blood Group': 'O+',
        'BMI': '26.4',
        'DOB': '1984-08-15',
        'Emergency Contact': 'Priya Sharma (+91 98765 43210)',
        'Known Allergies': 'Penicillin, Sulfonamides',
        'Insurance ID': 'AR-98742-IN'
      },
      cardiology: {
        'Diagnosed Conditions': 'Stage 1 Hypertension, Mild Hyperlipidemia',
        'Last ECG Date': '2026-03-12',
        'Current Medications': 'Amlodipine 5mg QD, Atorvastatin 10mg HS',
        'Contraindicated Drugs': 'NSAIDs (Ibuprofen), Pseudoephedrine'
      },
      dermatology: {
        'Active Conditions': 'Seborrheic Dermatitis (Scalp)',
        'Current Topical Treatments': 'Ketoconazole 2% Shampoo',
        'Patch Test History': 'Negative for standard patch series (2025)'
      },
      prescriptions: [
        { date: '2026-03-12', doctor: 'Dr. R. Malhotra', medication: 'Amlodipine', dosage: '5mg QD', status: 'Filled' }
      ]
    },
    aiInsights: {
      riskFlags: 'Elevated cardiovascular risk based on 3-year hypertension history + current sodium intake.',
      interventions: [
        'Initiate low-sodium diet and stress test referral.',
        'Monitor daily blood pressure logs.',
        'Review lipid panel in 6 weeks.'
      ],
      diet: {
        recommended: ['Leafy greens', 'Oats', 'Salmon / Omega-3', 'Garlic'],
        restrict: ['Table salt', 'Processed meat', 'Caffeine', 'Pickles']
      }
    }
  },
  {
    id: 'P-15',
    token: '#A-15',
    name: 'Sunita Rao',
    age: 58,
    bloodGroup: 'A-',
    visitReason: 'Follow-up on post-operative cardiac rehab',
    lastVisit: '2026-05-20',
    waitDuration: 24,
    urgency: 'red',
    status: 'waiting',
    room: 'Room 105',
    doctor: 'Dr. S. Chatterjee',
    timelineStep: 2,
    medicalVault: {
      general: {
        'Blood Group': 'A-',
        'BMI': '24.1',
        'DOB': '1968-11-03',
        'Emergency Contact': 'K. Rao (+91 98989 12345)',
        'Known Allergies': 'Aspirin',
        'Insurance ID': 'AR-12095-IN'
      },
      cardiology: {
        'Diagnosed Conditions': 'Coronary Artery Disease, CABG Post-Op (6 months)',
        'Last ECG Date': '2026-05-20',
        'Current Medications': 'Clopidogrel 75mg QD, Metoprolol 25mg BID',
        'Contraindicated Drugs': 'Sildenafil, High-dose Ibuprofen'
      },
      dermatology: {
        'Active Conditions': 'None',
        'Current Topical Treatments': 'None',
        'Patch Test History': 'N/A'
      },
      prescriptions: [
        { date: '2026-05-20', doctor: 'Dr. S. Chatterjee', medication: 'Clopidogrel', dosage: '75mg QD', status: 'Filled' }
      ]
    },
    aiInsights: {
      riskFlags: 'Post-CABG recovery is stable. Monitor heart rate for bradycardia side-effects from Beta-blockers.',
      interventions: [
        'Maintain daily aerobic walking program.',
        'Strict medication adherence check.',
        'Schedule echocardiogram at 1-year post-op mark.'
      ],
      diet: {
        recommended: ['Olive oil', 'Walnuts', 'Spinach', 'Blueberries'],
        restrict: ['Butter / Saturated fat', 'High sodium soups', 'Coconut oil', 'Red meat']
      }
    }
  },
  {
    id: 'P-03',
    token: '#A-03',
    name: 'Vikram Malhotra',
    age: 31,
    bloodGroup: 'B+',
    visitReason: 'Acute skin rash and itching on forearms',
    lastVisit: '2026-01-10',
    waitDuration: 6,
    urgency: 'green',
    status: 'waiting',
    room: 'Room 201',
    doctor: 'Dr. A. Sen',
    timelineStep: 2,
    medicalVault: {
      general: {
        'Blood Group': 'B+',
        'BMI': '22.8',
        'DOB': '1995-04-22',
        'Emergency Contact': 'Rita Malhotra (+91 91111 22222)',
        'Known Allergies': 'Latex, Nickel',
        'Insurance ID': 'AR-88349-IN'
      },
      cardiology: {
        'Diagnosed Conditions': 'None',
        'Last ECG Date': 'N/A',
        'Current Medications': 'None',
        'Contraindicated Drugs': 'None'
      },
      dermatology: {
        'Active Conditions': 'Contact Dermatitis (Suspected Nickel exposure)',
        'Current Topical Treatments': 'Hydrocortisone 1% Cream PRN',
        'Patch Test History': 'Positive for Nickel Sulfate (2024)'
      },
      prescriptions: [
        { date: '2026-01-10', doctor: 'Dr. A. Sen', medication: 'Hydrocortisone', dosage: 'Apply thin layer BID', status: 'Filled' }
      ]
    },
    aiInsights: {
      riskFlags: 'Allergic contact dermatitis flare-up. Check for nickel buckle exposure.',
      interventions: [
        'Avoid metal contacts directly on skin.',
        'Apply topical steroid cream as directed.',
        'Use hypoallergenic soaps and cleansers.'
      ],
      diet: {
        recommended: ['Probiotic yogurt', 'Green tea', 'Turmeric', 'Watermelon'],
        restrict: ['Canned foods', 'Cocoa / Dark chocolate', 'Soybeans', 'Nuts']
      }
    }
  }
];

const INITIAL_ROOMS = [
  { room: 'Room 102', doctor: 'Dr. R. Malhotra', patientToken: '#A-42', status: 'IN SESSION', duration: '14 min' },
  { room: 'Room 105', doctor: 'Dr. S. Chatterjee', patientToken: '-', status: 'AVAILABLE', duration: '0 min' },
  { room: 'Room 201', doctor: 'Dr. A. Sen', patientToken: '#A-03', status: 'IN SESSION', duration: '8 min' },
  { room: 'Room 203', doctor: 'Dr. P. Deshmukh', patientToken: '-', status: 'ON BREAK', duration: '20 min' }
];

const INITIAL_TICKETS = [
  {
    id: 'T-1',
    token: '#A-08',
    patientName: 'Meera Nair',
    doctorId: 'Dr. A. Sen',
    prescriptionSummary: 'Montelukast 10mg + Cetirizine 10mg',
    timestamp: '14:15',
    status: 'incoming'
  },
  {
    id: 'T-2',
    token: '#A-11',
    patientName: 'Rahul Verma',
    doctorId: 'Dr. R. Malhotra',
    prescriptionSummary: 'Metformin 500mg BID',
    timestamp: '14:05',
    status: 'preparation',
    startedAt: '14:12',
    pharmacist: 'Rohan'
  },
  {
    id: 'T-3',
    token: '#A-02',
    patientName: 'Karan Johar',
    doctorId: 'Dr. S. Chatterjee',
    prescriptionSummary: 'Atorvastatin 20mg + Aspirin 75mg',
    timestamp: '13:50',
    status: 'completed',
    completedAt: '14:08'
  }
];

// Helper to format DB keys to camelCase UI keys
const formatDbPatient = (p) => ({
  id: p.id,
  token: p.token,
  name: p.name,
  age: p.age,
  bloodGroup: p.blood_group,
  visitReason: p.visit_reason,
  lastVisit: p.last_visit,
  waitDuration: p.wait_duration,
  urgency: p.urgency,
  status: p.status,
  room: p.room,
  doctor: p.doctor,
  timelineStep: p.timeline_step,
  privacyGranted: p.privacy_granted,
  medicalVault: p.medical_vault,
  aiInsights: p.ai_insights
});

const formatDbRoom = (r) => ({
  room: r.room,
  doctor: r.doctor,
  patientToken: r.patient_token,
  status: r.status,
  duration: r.duration
});

const formatDbTicket = (t) => ({
  id: t.id,
  token: t.token,
  patientName: t.patient_name,
  doctorId: t.doctor_id,
  prescriptionSummary: t.prescription_summary,
  timestamp: t.timestamp,
  status: t.status,
  startedAt: t.started_at,
  pharmacist: t.pharmacist,
  completedAt: t.completed_at
});

// Original reducer for Offline fallback
function queueReducer(state, action) {
  switch (action.type) {
    case 'TICK_WAIT_TIMES': {
      const updatedPatients = state.patients.map(p => {
        if (p.status === 'waiting' || p.status === 'in-progress') {
          const newWait = p.waitDuration + 1;
          let newUrgency = 'green';
          if (newWait >= 20) newUrgency = 'red';
          else if (newWait >= 10) newUrgency = 'amber';
          return { ...p, waitDuration: newWait, urgency: newUrgency };
        }
        return p;
      });

      const updatedRooms = state.rooms.map(r => {
        if (r.status === 'IN SESSION') {
          const currentMins = parseInt(r.duration.split(' ')[0]);
          return { ...r, duration: `${currentMins + 1} min` };
        }
        return r;
      });

      return {
        ...state,
        patients: updatedPatients,
        rooms: updatedRooms,
        pulseCounter: state.pulseCounter + 1
      };
    }

    case 'CALL_PATIENT': {
      const updatedPatients = state.patients.map(p => {
        if (p.id === action.payload.patientId) {
          return { ...p, status: 'in-progress', timelineStep: 3 };
        }
        if (p.status === 'in-progress' && p.doctor === action.payload.doctorName) {
          return { ...p, status: 'completed', timelineStep: 4 };
        }
        return p;
      });

      const updatedRooms = state.rooms.map(r => {
        if (r.doctor === action.payload.doctorName) {
          return { ...r, status: 'IN SESSION', patientToken: action.payload.token, duration: '0 min' };
        }
        return r;
      });

      return {
        ...state,
        patients: updatedPatients,
        rooms: updatedRooms,
        activePatientId: action.payload.patientId
      };
    }

    case 'DISPATCH_PRESCRIPTION': {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const updatedPatients = state.patients.map(p => {
        if (p.id === action.payload.patientId) {
          const rxList = [...(p.medicalVault.prescriptions || [])];
          rxList.unshift({
            date: now.toISOString().split('T')[0],
            doctor: p.doctor,
            medication: action.payload.medication,
            dosage: `${action.payload.dosage} ${action.payload.frequency}`,
            status: 'Pending'
          });

          return {
            ...p,
            status: 'completed',
            timelineStep: 4,
            medicalVault: {
              ...p.medicalVault,
              prescriptions: rxList
            }
          };
        }
        return p;
      });

      const targetPatient = state.patients.find(p => p.id === action.payload.patientId);
      const newTicket = {
        id: `T-${Date.now()}`,
        token: targetPatient ? targetPatient.token : '#A-XX',
        patientName: targetPatient ? targetPatient.name : 'Unknown Patient',
        doctorId: targetPatient ? targetPatient.doctor : 'Doctor',
        prescriptionSummary: `${action.payload.medication} (${action.payload.dosage})`,
        timestamp: timeStr,
        status: 'incoming'
      };

      const updatedRooms = state.rooms.map(r => {
        if (targetPatient && r.doctor === targetPatient.doctor) {
          return { ...r, status: 'AVAILABLE', patientToken: '-', duration: '0 min' };
        }
        return r;
      });

      return {
        ...state,
        patients: updatedPatients,
        rooms: updatedRooms,
        tickets: [newTicket, ...state.tickets],
        lastDispatchedRx: {
          token: newTicket.token,
          time: timeStr
        }
      };
    }

    case 'BEGIN_PREP': {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const pharmacists = ['Rohan', 'Amit', 'Priya', 'Sara'];
      const assignedPharmacist = pharmacists[Math.floor(Math.random() * pharmacists.length)];

      const updatedTickets = state.tickets.map(t => {
        if (t.id === action.payload) {
          return { ...t, status: 'preparation', startedAt: timeStr, pharmacist: assignedPharmacist };
        }
        return t;
      });

      return { ...state, tickets: updatedTickets };
    }

    case 'COMPLETE_PREP': {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const updatedTickets = state.tickets.map(t => {
        if (t.id === action.payload) {
          return { ...t, status: 'completed', completedAt: timeStr };
        }
        return t;
      });

      const targetTicket = state.tickets.find(t => t.id === action.payload);
      const updatedPatients = state.patients.map(p => {
        if (targetTicket && p.token === targetTicket.token) {
          return { ...p, timelineStep: 5 };
        }
        return p;
      });

      return { ...state, tickets: updatedTickets, patients: updatedPatients };
    }

    case 'TOGGLE_PRIVACY': {
      return { ...state, privacyGranted: !state.privacyGranted };
    }

    case 'CHECK_IN_PATIENT': {
      return {
        ...state,
        patients: [...state.patients, action.payload]
      };
    }

    default:
      return state;
  }
}

export function QueueProvider({ children }) {
  // Offline state manager
  const [offlineState, dispatch] = useReducer(queueReducer, {
    patients: INITIAL_PATIENTS,
    rooms: INITIAL_ROOMS,
    tickets: INITIAL_TICKETS,
    activePatientId: 'P-42',
    lastDispatchedRx: null,
    privacyGranted: false,
    pulseCounter: 0
  });

  // DB Sync states
  const [dbConnected, setDbConnected] = useState(false);
  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [activePatientId, setActivePatientId] = useState('P-42');
  const [lastDispatchedRx, setLastDispatchedRx] = useState(null);
  const [privacyGranted, setPrivacyGranted] = useState(false);
  const [pulseCounter, setPulseCounter] = useState(0);

  // Connection manager & Postgres subscription effects
  useEffect(() => {
    let active = true;
    let patSub, roomSub, ticketSub;

    const initDb = async () => {
      if (!supabase) return;
      const connected = await checkSupabaseConnection();
      if (!connected || !active) return;

      setDbConnected(true);

      const fetchAll = async () => {
        const { data: pats } = await supabase.from('patients').select('*');
        if (pats && active) {
          const formatted = pats.map(formatDbPatient);
          setPatients(formatted);
          const p42 = formatted.find(p => p.id === 'P-42');
          if (p42) setPrivacyGranted(p42.privacyGranted);
        }

        const { data: rms } = await supabase.from('rooms').select('*');
        if (rms && active) {
          setRooms(rms.map(formatDbRoom));
        }

        const { data: tcks } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
        if (tcks && active) {
          setTickets(tcks.map(formatDbTicket));
        }
      };

      await fetchAll();

      // Subscribe to real-time changes
      patSub = supabase.channel('pat-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, async () => {
          const { data } = await supabase.from('patients').select('*');
          if (data && active) {
            const formatted = data.map(formatDbPatient);
            setPatients(formatted);
            const p42 = formatted.find(p => p.id === 'P-42');
            if (p42) setPrivacyGranted(p42.privacyGranted);
          }
        }).subscribe();

      roomSub = supabase.channel('room-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, async () => {
          const { data } = await supabase.from('rooms').select('*');
          if (data && active) {
            setRooms(data.map(formatDbRoom));
          }
        }).subscribe();

      ticketSub = supabase.channel('ticket-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, async () => {
          const { data } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
          if (data && active) {
            setTickets(data.map(formatDbTicket));
          }
        }).subscribe();
    };

    initDb();

    return () => {
      active = false;
      if (patSub) supabase.removeChannel(patSub);
      if (roomSub) supabase.removeChannel(roomSub);
      if (ticketSub) supabase.removeChannel(ticketSub);
    };
  }, []);

  // Local tick effect for UI wait times (doesn't spam Supabase writes)
  useEffect(() => {
    const timer = setInterval(() => {
      const updatePats = (prev) => prev.map(p => {
        if (p.status === 'waiting' || p.status === 'in-progress') {
          const newWait = p.waitDuration + 1;
          let newUrgency = 'green';
          if (newWait >= 20) newUrgency = 'red';
          else if (newWait >= 10) newUrgency = 'amber';
          return { ...p, waitDuration: newWait, urgency: newUrgency };
        }
        return p;
      });

      const updateRms = (prev) => prev.map(r => {
        if (r.status === 'IN SESSION') {
          const currentMins = parseInt(r.duration.split(' ')[0]);
          return { ...r, duration: `${currentMins + 1} min` };
        }
        return r;
      });

      if (dbConnected) {
        setPatients(updatePats);
        setRooms(updateRms);
        setPulseCounter(prev => prev + 1);
      } else {
        dispatch({ type: 'TICK_WAIT_TIMES' });
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [dbConnected]);

  // Actions
  const callNextPatient = async (patientId, token, doctorName) => {
    if (dbConnected) {
      try {
        // 1. Set called patient to 'in-progress'
        await supabase.from('patients').update({ status: 'in-progress', timeline_step: 3 }).eq('id', patientId);
        
        // 2. Archive previous active patients under the same doctor
        await supabase.from('patients').update({ status: 'completed', timeline_step: 4 }).eq('status', 'in-progress').eq('doctor', doctorName).neq('id', patientId);
        
        // 3. Update room status
        await supabase.from('rooms').update({ status: 'IN SESSION', patient_token: token, duration: '0 min' }).eq('doctor', doctorName);

        setActivePatientId(patientId);
      } catch (err) {
        console.error('DB callNextPatient failed:', err);
      }
    } else {
      dispatch({ type: 'CALL_PATIENT', payload: { patientId, token, doctorName } });
      setActivePatientId(patientId);
    }
  };

  const dispatchPrescription = async (patientId, medication, dosage, frequency) => {
    if (dbConnected) {
      try {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const targetPatient = patients.find(p => p.id === patientId);
        if (!targetPatient) return;

        const newRx = {
          date: now.toISOString().split('T')[0],
          doctor: targetPatient.doctor,
          medication,
          dosage: `${dosage} ${frequency}`,
          status: 'Pending'
        };
        const rxList = [newRx, ...(targetPatient.medicalVault.prescriptions || [])];

        // 1. Update patient records
        await supabase.from('patients').update({
          status: 'completed',
          timeline_step: 4,
          medical_vault: { ...targetPatient.medicalVault, prescriptions: rxList }
        }).eq('id', patientId);

        // 2. Dispatch Pharmacy Ticket
        const newTicket = {
          id: `T-${Date.now()}`,
          token: targetPatient.token,
          patient_name: targetPatient.name,
          doctor_id: targetPatient.doctor,
          prescription_summary: `${medication} (${dosage})`,
          timestamp: timeStr,
          status: 'incoming'
        };
        await supabase.from('tickets').insert(newTicket);

        // 3. Release room status
        await supabase.from('rooms').update({
          status: 'AVAILABLE',
          patient_token: '-',
          duration: '0 min'
        }).eq('doctor', targetPatient.doctor);

        setLastDispatchedRx({
          token: newTicket.token,
          time: timeStr
        });
      } catch (err) {
        console.error('DB dispatchPrescription failed:', err);
      }
    } else {
      dispatch({ type: 'DISPATCH_PRESCRIPTION', payload: { patientId, medication, dosage, frequency } });
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const targetPatient = offlineState.patients.find(p => p.id === patientId);
      setLastDispatchedRx({
        token: targetPatient ? targetPatient.token : '#A-XX',
        time: timeStr
      });
    }
  };

  const beginPrep = async (ticketId) => {
    if (dbConnected) {
      try {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const pharmacists = ['Rohan', 'Amit', 'Priya', 'Sara'];
        const assignedPharmacist = pharmacists[Math.floor(Math.random() * pharmacists.length)];

        await supabase.from('tickets').update({
          status: 'preparation',
          started_at: timeStr,
          pharmacist: assignedPharmacist
        }).eq('id', ticketId);
      } catch (err) {
        console.error('DB beginPrep failed:', err);
      }
    } else {
      dispatch({ type: 'BEGIN_PREP', payload: ticketId });
    }
  };

  const completePrep = async (ticketId) => {
    if (dbConnected) {
      try {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const targetTicket = tickets.find(t => t.id === ticketId);

        await supabase.from('tickets').update({
          status: 'completed',
          completed_at: timeStr
        }).eq('id', ticketId);

        if (targetTicket) {
          const matchingPatient = patients.find(p => p.token === targetTicket.token);
          if (matchingPatient) {
            await supabase.from('patients').update({ timeline_step: 5 }).eq('id', matchingPatient.id);
          }
        }
      } catch (err) {
        console.error('DB completePrep failed:', err);
      }
    } else {
      dispatch({ type: 'COMPLETE_PREP', payload: ticketId });
    }
  };

  const togglePrivacy = async (patientId) => {
    if (dbConnected) {
      try {
        const nextVal = !privacyGranted;
        const targetId = patientId || 'P-42';
        await supabase.from('patients').update({ privacy_granted: nextVal }).eq('id', targetId);
        setPrivacyGranted(nextVal);
      } catch (err) {
        console.error('DB togglePrivacy failed:', err);
      }
    } else {
      dispatch({ type: 'TOGGLE_PRIVACY' });
      setPrivacyGranted(prev => !prev);
    }
  };

  const checkInPatient = async (patientDetails) => {
    console.log('[QueueContext] checkInPatient triggered with details:', patientDetails);
    const randTokenNum = Math.floor(Math.random() * 90) + 10;
    const token = `#A-${randTokenNum}`;
    const doctors = ['Dr. R. Malhotra', 'Dr. S. Chatterjee', 'Dr. A. Sen', 'Dr. P. Deshmukh'];
    const doctor = doctors[Math.floor(Math.random() * doctors.length)];
    const roomsList = ['Room 102', 'Room 105', 'Room 201', 'Room 203'];
    const room = roomsList[Math.floor(Math.random() * roomsList.length)];

    const uiPatient = {
      id: patientDetails.id,
      token,
      name: patientDetails.name,
      age: parseInt(patientDetails.age) || 30,
      bloodGroup: patientDetails.bloodGroup || 'O+',
      visitReason: patientDetails.visitReason || 'General Checkup',
      lastVisit: new Date().toISOString().split('T')[0],
      waitDuration: 0,
      urgency: 'green',
      status: 'waiting',
      room,
      doctor,
      timelineStep: 2,
      privacyGranted: false,
      medicalVault: {
        general: {
          'Blood Group': patientDetails.bloodGroup || 'O+',
          'BMI': '22.0',
          'DOB': '1995-01-01',
          'Emergency Contact': 'N/A',
          'Known Allergies': 'None',
          'Insurance ID': 'N/A'
        },
        cardiology: {
          'Diagnosed Conditions': 'None',
          'Last ECG Date': 'N/A',
          'Current Medications': 'None',
          'Contraindicated Drugs': 'None'
        },
        dermatology: {
          'Active Conditions': 'None',
          'Current Topical Treatments': 'None',
          'Patch Test History': 'N/A'
        },
        prescriptions: []
      },
      aiInsights: {
        riskFlags: 'Initial intake complete. Awaiting doctor assessment.',
        interventions: ['Review active lifestyle goals.', 'Standard vitals check.'],
        diet: {
          recommended: ['Balanced proteins', 'Hydration', 'Fresh vegetables'],
          restrict: ['Excess sugar', 'Processed snacks']
        }
      }
    };

    if (dbConnected) {
      console.log('[QueueContext] Online DB Mode: Formatting patients table row...');
      const dbPatient = {
        id: uiPatient.id,
        token: uiPatient.token,
        name: uiPatient.name,
        age: uiPatient.age,
        blood_group: uiPatient.bloodGroup,
        visit_reason: uiPatient.visitReason,
        last_visit: uiPatient.lastVisit,
        wait_duration: uiPatient.waitDuration,
        urgency: uiPatient.urgency,
        status: uiPatient.status,
        room: uiPatient.room,
        doctor: uiPatient.doctor,
        timeline_step: uiPatient.timelineStep,
        privacy_granted: uiPatient.privacyGranted,
        medical_vault: uiPatient.medicalVault,
        ai_insights: uiPatient.aiInsights
      };
      try {
        console.log('[QueueContext] Online DB Mode: Inserting patient into Supabase...', dbPatient);
        const { error } = await supabase.from('patients').insert(dbPatient);
        if (error) {
          console.error('[QueueContext] Supabase patients insert returned error:', error);
          throw error;
        }
        console.log('[QueueContext] Supabase patients insert completed successfully.');
      } catch (err) {
        console.error('[QueueContext] DB checkInPatient exception caught:', err);
        throw err;
      }
    } else {
      console.log('[QueueContext] Offline Sandbox Mode: Dispatching CHECK_IN_PATIENT to local state...', uiPatient);
      dispatch({ type: 'CHECK_IN_PATIENT', payload: uiPatient });
    }
  };

  const getQueueSnapshot = () => {
    const activeList = dbConnected ? patients : offlineState.patients;
    return {
      docs: activeList.map(p => ({
        id: p.id,
        data: () => p
      })),
      size: activeList.length
    };
  };

  const getTicketsSnapshot = () => {
    const activeTickets = dbConnected ? tickets : offlineState.tickets;
    return {
      docs: activeTickets.map(t => ({
        id: t.id,
        data: () => t
      })),
      size: activeTickets.length
    };
  };

  const getActivePatientSnapshot = () => {
    const activeList = dbConnected ? patients : offlineState.patients;
    const activeId = dbConnected ? activePatientId : offlineState.activePatientId;
    const p = activeList.find(item => item.id === activeId);
    return p ? { exists: true, data: () => p } : { exists: false, data: () => null };
  };

  return (
    <QueueContext.Provider
      value={{
        queueSnapshot: getQueueSnapshot(),
        ticketsSnapshot: getTicketsSnapshot(),
        activePatientSnapshot: getActivePatientSnapshot(),
        rooms: dbConnected ? rooms : offlineState.rooms,
        privacyGranted: dbConnected ? privacyGranted : offlineState.privacyGranted,
        kpiCheckins: dbConnected ? 47 : 47,
        queueSlots: [
          'waiting', 'in-progress', 'waiting', 'empty', 'completed',
          'waiting', 'empty', 'in-progress', 'waiting', 'empty',
          'completed', 'waiting', 'empty', 'empty', 'waiting',
          'in-progress', 'completed', 'empty', 'waiting', 'empty'
        ],
        lastDispatchedRx: dbConnected ? lastDispatchedRx : offlineState.lastDispatchedRx,
        pulseCounter: dbConnected ? pulseCounter : offlineState.pulseCounter,
        dbConnected,
        callNextPatient,
        dispatchPrescription,
        beginPrep,
        completePrep,
        togglePrivacy,
        checkInPatient
      }}
    >
      {children}
    </QueueContext.Provider>
  );
}
