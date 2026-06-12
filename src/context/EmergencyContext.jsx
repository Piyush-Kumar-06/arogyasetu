import React, { createContext, useReducer, useEffect, useState } from 'react';
import { supabase, checkSupabaseConnection } from '../utils/supabaseClient';

export const EmergencyContext = createContext();

function emergencyReducer(state, action) {
  switch (action.type) {
    case 'START_SOS':
      return {
        ...state,
        sosState: 'locating',
        phase: 1,
        selectedAmbulance: null,
        selectedHospital: null,
        eta: null,
        countdown: 15,
        patientName: action.payload.patientName,
        patientId: action.payload.patientId,
        symptom: action.payload.symptom,
        location: action.payload.location,
        patientLat: action.payload.patientLat || null,
        patientLng: action.payload.patientLng || null,
        driverLat: null,
        driverLng: null,
        hospitalLat: null,
        hospitalLng: null,
      };
    case 'SET_PHASE':
      return {
        ...state,
        phase: action.payload,
        sosState: action.payload === 1 ? 'locating' : action.payload === 2 ? 'matching' : 'dispatched'
      };
    case 'ASSIGN_DISPATCH':
      return {
        ...state,
        phase: 3,
        sosState: 'dispatched',
        selectedAmbulance: action.payload.ambulance,
        selectedHospital: action.payload.hospital,
        eta: action.payload.eta,
        hospitalLat: action.payload.hospitalLat || null,
        hospitalLng: action.payload.hospitalLng || null,
        countdown: 180
      };
    case 'DRIVER_ACCEPT':
      return {
        ...state,
        phase: 3,
        sosState: 'dispatched',
        selectedAmbulance: action.payload.ambulance,
        selectedHospital: action.payload.hospital,
        hospitalLat: action.payload.hospitalLat || null,
        hospitalLng: action.payload.hospitalLng || null,
        driverLat: action.payload.driverLat || null,
        driverLng: action.payload.driverLng || null,
        countdown: 180
      };
    case 'UPDATE_DRIVER_LOCATION':
      return {
        ...state,
        driverLat: action.payload.lat,
        driverLng: action.payload.lng,
      };
    case 'DRIVER_REACHED':
      return {
        ...state,
        phase: 4,
        sosState: 'transit',
        countdown: 240
      };
    case 'DRIVER_COMPLETE':
      return {
        ...state,
        phase: 5,
        sosState: 'completed',
        countdown: 0
      };
    case 'CANCEL_SOS':
      return {
        ...state,
        sosState: 'inactive',
        phase: 0,
        selectedAmbulance: null,
        selectedHospital: null,
        eta: null,
        patientName: null,
        patientId: null,
        symptom: null,
        location: null,
        patientLat: null,
        patientLng: null,
        driverLat: null,
        driverLng: null,
        hospitalLat: null,
        hospitalLng: null,
      };
    case 'TICK_COUNTDOWN':
      return {
        ...state,
        countdown: state.countdown > 0 ? state.countdown - 1 : 0
      };
    case 'UPDATE_HOSPITAL':
      return {
        ...state,
        selectedHospital: action.payload,
        hospitalLat: action.payload.lat || null,
        hospitalLng: action.payload.lng || null,
      };
    default:
      return state;
  }
}

const formatDbSos = (row) => ({
  sosState: row.sos_state,
  phase: row.phase,
  countdown: row.countdown,
  selectedAmbulance: row.selected_ambulance,
  selectedHospital: row.selected_hospital,
  eta: row.eta || null,
  patientName: row.patient_name,
  patientId: row.patient_id,
  symptom: row.symptom,
  location: row.location,
  patientLat: row.patient_lat || null,
  patientLng: row.patient_lng || null,
  driverLat: row.driver_lat || null,
  driverLng: row.driver_lng || null,
  hospitalLat: row.hospital_lat || null,
  hospitalLng: row.hospital_lng || null,
});

export function EmergencyProvider({ children }) {
  // Offline State Fallback
  const [offlineState, dispatch] = useReducer(emergencyReducer, {
    sosState: 'inactive',
    phase: 0,
    selectedAmbulance: null,
    selectedHospital: null,
    eta: null,
    countdown: 0,
    patientName: null,
    patientId: null,
    symptom: null,
    location: null,
    patientLat: null,
    patientLng: null,
    driverLat: null,
    driverLng: null,
    hospitalLat: null,
    hospitalLng: null,
  });

  // DB States
  const [dbConnected, setDbConnected] = useState(false);
  const [sosState, setSosState] = useState({
    sosState: 'inactive',
    phase: 0,
    selectedAmbulance: null,
    selectedHospital: null,
    countdown: 0,
    patientName: null,
    patientId: null,
    symptom: null,
    location: null,
    patientLat: null,
    patientLng: null,
    driverLat: null,
    driverLng: null,
    hospitalLat: null,
    hospitalLng: null,
  });

  // DB Initialization & Real-Time Sync Subscription
  useEffect(() => {
    let active = true;
    let sosSub;

    const initSosDb = async () => {
      if (!supabase) return;
      const connected = await checkSupabaseConnection();
      if (!connected || !active) return;

      setDbConnected(true);

      const fetchSos = async () => {
        const { data, error } = await supabase.from('emergency_sos').select('*').eq('id', 1).maybeSingle();
        if (data && active) {
          setSosState(formatDbSos(data));
        } else if (error) {
          console.warn('Failed to load emergency SOS status:', error.message);
        }
      };

      await fetchSos();

      sosSub = supabase.channel('emergency-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_sos' }, payload => {
          if (payload.new && payload.new.id === 1 && active) {
            setSosState(formatDbSos(payload.new));
          }
        }).subscribe();
    };

    initSosDb();

    return () => {
      active = false;
      if (sosSub) supabase.removeChannel(sosSub);
    };
  }, []);

  // Tick Countdown locally to avoid spamming Supabase writes every 1 sec
  useEffect(() => {
    let timer;
    const activeState = dbConnected ? sosState.sosState : offlineState.sosState;
    if (activeState !== 'inactive') {
      timer = setInterval(() => {
        if (dbConnected) {
          setSosState(prev => ({
            ...prev,
            countdown: prev.countdown > 0 ? prev.countdown - 1 : 0
          }));
        } else {
          dispatch({ type: 'TICK_COUNTDOWN' });
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [dbConnected, sosState.sosState, offlineState.sosState]);

  // Phase 1 to Phase 2 Auto Match Transition after 3 seconds
  useEffect(() => {
    let phaseTimer;
    const activeState = dbConnected ? sosState.sosState : offlineState.sosState;
    if (activeState === 'locating') {
      phaseTimer = setTimeout(async () => {
        if (dbConnected) {
          try {
            await supabase.from('emergency_sos').update({
              sos_state: 'matching',
              phase: 2
            }).eq('id', 1);
          } catch (err) {
            console.error('Failed to transition to Phase 2:', err);
          }
        } else {
          dispatch({ type: 'SET_PHASE', payload: 2 });
        }
      }, 3000);
    }
    return () => clearTimeout(phaseTimer);
  }, [dbConnected, sosState.sosState, offlineState.sosState]);

  // Handlers
  const startSOS = async (patientDetails) => {
    const pName = patientDetails?.name || 'Emergency Patient';
    const pId = patientDetails?.id || 'Unknown';
    const pSymptom = patientDetails?.symptom || 'Cardiac Distress';
    const pLoc = patientDetails?.location || 'Location Acquiring...';
    const pLat = patientDetails?.lat || null;
    const pLng = patientDetails?.lng || null;

    if (dbConnected) {
      try {
        await supabase.from('emergency_sos').update({
          sos_state: 'locating',
          phase: 1,
          selected_ambulance: null,
          selected_hospital: null,
          countdown: 15,
          patient_name: pName,
          patient_id: pId,
          symptom: pSymptom,
          location: pLoc,
          patient_lat: pLat,
          patient_lng: pLng,
          driver_lat: null,
          driver_lng: null,
          hospital_lat: null,
          hospital_lng: null,
        }).eq('id', 1);
      } catch (err) {
        console.error('DB startSOS failed:', err);
      }
    } else {
      dispatch({
        type: 'START_SOS',
        payload: {
          patientName: pName,
          patientId: pId,
          symptom: pSymptom,
          location: pLoc,
          patientLat: pLat,
          patientLng: pLng,
        }
      });
    }
  };

  const cancelSOS = async () => {
    if (dbConnected) {
      try {
        await supabase.from('emergency_sos').update({
          sos_state: 'inactive',
          phase: 0,
          selected_ambulance: null,
          selected_hospital: null,
          countdown: 0,
          patient_name: null,
          patient_id: null,
          symptom: null,
          location: null,
          patient_lat: null,
          patient_lng: null,
          driver_lat: null,
          driver_lng: null,
          hospital_lat: null,
          hospital_lng: null,
        }).eq('id', 1);
      } catch (err) {
        console.error('DB cancelSOS failed:', err);
      }
    } else {
      dispatch({ type: 'CANCEL_SOS' });
    }
  };

  const acceptSOS = async (ambulance, hospital, hospitalCoords, driverCoords) => {
    const currentActiveState = dbConnected ? sosState : offlineState;
    const pLat = currentActiveState.patientLat || 28.6139;
    const pLng = currentActiveState.patientLng || 77.2090;

    // Hospital default coords offset from patient (so it is local and nearby)
    const hLat = hospitalCoords?.lat || (pLat - 0.004);
    const hLng = hospitalCoords?.lng || (pLng + 0.004);

    // Use driver's real GPS if available, otherwise fallback to offset
    const dLat = driverCoords?.lat || (pLat + 0.005);
    const dLng = driverCoords?.lng || (pLng - 0.005);

    if (dbConnected) {
      try {
        await supabase.from('emergency_sos').update({
          sos_state: 'dispatched',
          phase: 3,
          selected_ambulance: ambulance,
          selected_hospital: hospital,
          countdown: 180,
          hospital_lat: hLat,
          hospital_lng: hLng,
          driver_lat: dLat,
          driver_lng: dLng,
        }).eq('id', 1);
      } catch (err) {
        console.error('DB acceptSOS failed:', err);
      }
    } else {
      dispatch({ 
        type: 'DRIVER_ACCEPT', 
        payload: { 
          ambulance, 
          hospital, 
          hospitalLat: hLat, 
          hospitalLng: hLng,
          driverLat: dLat,
          driverLng: dLng
        } 
      });
    }
  };

  const updateDriverLocation = async (lat, lng) => {
    if (dbConnected) {
      try {
        await supabase.from('emergency_sos').update({
          driver_lat: lat,
          driver_lng: lng,
        }).eq('id', 1);
      } catch (err) {
        console.error('DB updateDriverLocation failed:', err);
      }
    } else {
      dispatch({ type: 'UPDATE_DRIVER_LOCATION', payload: { lat, lng } });
    }
  };

  const updateHospital = async (hospital) => {
    if (dbConnected) {
      try {
        await supabase.from('emergency_sos').update({
          selected_hospital: { name: hospital.name, distance: hospital.distance || '0 km' },
          hospital_lat: hospital.lat,
          hospital_lng: hospital.lng,
        }).eq('id', 1);
      } catch (err) {
        console.error('DB updateHospital failed:', err);
      }
    } else {
      dispatch({ type: 'UPDATE_HOSPITAL', payload: hospital });
    }
  };

  const reachPatient = async () => {
    if (dbConnected) {
      try {
        await supabase.from('emergency_sos').update({
          sos_state: 'transit',
          phase: 4,
          countdown: 240
        }).eq('id', 1);
      } catch (err) {
        console.error('DB reachPatient failed:', err);
      }
    } else {
      dispatch({ type: 'DRIVER_REACHED' });
    }
  };

  const completeHandover = async () => {
    if (dbConnected) {
      try {
        await supabase.from('emergency_sos').update({
          sos_state: 'completed',
          phase: 5,
          countdown: 0
        }).eq('id', 1);
      } catch (err) {
        console.error('DB completeHandover failed:', err);
      }
    } else {
      dispatch({ type: 'DRIVER_COMPLETE' });
    }
  };

  const assignDispatch = async (ambulance, hospital, eta) => {
    if (dbConnected) {
      try {
        await supabase.from('emergency_sos').update({
          sos_state: 'dispatched',
          phase: 3,
          selected_ambulance: ambulance,
          selected_hospital: hospital,
          countdown: 180
        }).eq('id', 1);
      } catch (err) {
        console.error('DB assignDispatch failed:', err);
      }
    } else {
      dispatch({ type: 'ASSIGN_DISPATCH', payload: { ambulance, hospital, eta } });
    }
  };

  const activeState = dbConnected ? sosState : offlineState;

  return (
    <EmergencyContext.Provider value={{
      ...activeState,
      dbConnected,
      startSOS,
      cancelSOS,
      acceptSOS,
      reachPatient,
      completeHandover,
      assignDispatch,
      updateDriverLocation,
      updateHospital,
    }}>
      {children}
    </EmergencyContext.Provider>
  );
}
