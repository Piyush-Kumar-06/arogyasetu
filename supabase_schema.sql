-- ==========================================
-- AROGYAFLOW SUPABASE COMPLETE BACKEND SCHEMA
-- ==========================================
-- Run this script in your Supabase SQL Editor to provision tables,
-- seed initial data, configure permissive row-level policies, 
-- and enable Postgres Realtime streams.

-- 1. Enable UUID Extension (required for auth linking)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE PROFILES TABLE (Links Supabase auth.users to App roles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'pharmacy', 'driver')),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2.5 TRIGGER TO AUTOMATICALLY PROPAGATE AUTH USERS TO PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'patient'),
    COALESCE(new.raw_user_meta_data->>'name', 'New User')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. CREATE PATIENTS QUEUE TABLE
CREATE TABLE IF NOT EXISTS public.patients (
  id TEXT PRIMARY KEY, -- linked to profile ID or sandbox key
  token TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  blood_group TEXT NOT NULL,
  visit_reason TEXT NOT NULL,
  last_visit TEXT NOT NULL,
  wait_duration INTEGER DEFAULT 0,
  urgency TEXT NOT NULL DEFAULT 'green',
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting | in-progress | completed
  room TEXT,
  doctor TEXT,
  timeline_step INTEGER DEFAULT 2, -- 1 to 5
  privacy_granted BOOLEAN DEFAULT false,
  medical_vault JSONB DEFAULT '{}'::jsonb,
  ai_insights JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. CREATE ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  room TEXT PRIMARY KEY,
  doctor TEXT NOT NULL,
  patient_token TEXT DEFAULT '-',
  status TEXT NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE | IN SESSION | ON BREAK
  duration TEXT DEFAULT '0 min',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. CREATE PHARMACY TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  prescription_summary TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'incoming', -- incoming | preparation | completed
  started_at TEXT,
  pharmacist TEXT,
  completed_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. CREATE EMERGENCY SOS TABLE (Singleton table)
CREATE TABLE IF NOT EXISTS public.emergency_sos (
  id INTEGER PRIMARY KEY,
  sos_state TEXT NOT NULL DEFAULT 'inactive', -- inactive | locating | matching | dispatched | transit | completed
  phase INTEGER DEFAULT 0,
  countdown INTEGER DEFAULT 0,
  selected_ambulance JSONB,
  selected_hospital JSONB,
  patient_name TEXT,
  patient_id TEXT,
  symptom TEXT,
  location TEXT,
  patient_lat DOUBLE PRECISION,
  patient_lng DOUBLE PRECISION,
  driver_lat DOUBLE PRECISION,
  driver_lng DOUBLE PRECISION,
  hospital_lat DOUBLE PRECISION,
  hospital_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Quick migration if columns were previously created as TEXT
ALTER TABLE public.emergency_sos DROP COLUMN IF EXISTS selected_ambulance;
ALTER TABLE public.emergency_sos DROP COLUMN IF EXISTS selected_hospital;
ALTER TABLE public.emergency_sos ADD COLUMN selected_ambulance JSONB;
ALTER TABLE public.emergency_sos ADD COLUMN selected_hospital JSONB;
ALTER TABLE public.emergency_sos ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.emergency_sos ADD COLUMN IF NOT EXISTS patient_id TEXT;
ALTER TABLE public.emergency_sos ADD COLUMN IF NOT EXISTS symptom TEXT;
ALTER TABLE public.emergency_sos ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.emergency_sos ADD COLUMN IF NOT EXISTS patient_lat DOUBLE PRECISION;
ALTER TABLE public.emergency_sos ADD COLUMN IF NOT EXISTS patient_lng DOUBLE PRECISION;
ALTER TABLE public.emergency_sos ADD COLUMN IF NOT EXISTS driver_lat DOUBLE PRECISION;
ALTER TABLE public.emergency_sos ADD COLUMN IF NOT EXISTS driver_lng DOUBLE PRECISION;
ALTER TABLE public.emergency_sos ADD COLUMN IF NOT EXISTS hospital_lat DOUBLE PRECISION;
ALTER TABLE public.emergency_sos ADD COLUMN IF NOT EXISTS hospital_lng DOUBLE PRECISION;

-- =======================================================
-- ROW LEVEL SECURITY (RLS) & PUBLIC BYPASS POLICIES
-- =======================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_sos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read/write to patients" ON public.patients;
DROP POLICY IF EXISTS "Allow public read/write to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow public read/write to tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow public read/write to emergency_sos" ON public.emergency_sos;

-- Profiles Policies
CREATE POLICY "Allow public read access to profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to insert their own profile" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (true);

-- Patients Policies (Permissive read/write for frontend demo syncing)
CREATE POLICY "Allow public read/write to patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);

-- Rooms Policies
CREATE POLICY "Allow public read/write to rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);

-- Tickets Policies
CREATE POLICY "Allow public read/write to tickets" ON public.tickets FOR ALL USING (true) WITH CHECK (true);

-- Emergency SOS Policies
CREATE POLICY "Allow public read/write to emergency_sos" ON public.emergency_sos FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- ACTIVATE POSTGRES REALTIME REPLICATION
-- ==========================================
-- Ensure the publication exists
DO $$
BEGIN
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not create publication supabase_realtime: %', SQLERRM;
  END;
END $$;

-- Enable real-time updates for changes on these tables
DO $$
BEGIN
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'patients'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not add patients to publication. Please enable replication manually in your Supabase replication settings: %', SQLERRM;
  END;
  
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'rooms'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not add rooms to publication: %', SQLERRM;
  END;

  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'tickets'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not add tickets to publication: %', SQLERRM;
  END;

  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'emergency_sos'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_sos;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not add emergency_sos to publication: %', SQLERRM;
  END;
END $$;

-- ==========================================
-- INITIAL CLINICAL SEED DATA
-- ==========================================

-- Seed Rooms
INSERT INTO public.rooms (room, doctor, patient_token, status, duration) VALUES
('Room 102', 'Dr. R. Malhotra', '#A-42', 'IN SESSION', '14 min'),
('Room 105', 'Dr. S. Chatterjee', '-', 'AVAILABLE', '0 min'),
('Room 201', 'Dr. A. Sen', '#A-03', 'IN SESSION', '8 min'),
('Room 203', 'Dr. P. Deshmukh', '-', 'ON BREAK', '20 min')
ON CONFLICT (room) DO UPDATE SET
  doctor = EXCLUDED.doctor,
  patient_token = EXCLUDED.patient_token,
  status = EXCLUDED.status,
  duration = EXCLUDED.duration;

-- Seed Patients
INSERT INTO public.patients (id, token, name, age, blood_group, visit_reason, last_visit, wait_duration, urgency, status, room, doctor, timeline_step, privacy_granted, medical_vault, ai_insights) VALUES
('P-42', '#A-42', 'Aditya Sharma', 42, 'O+', 'Recurrent chest tightness and mild palpitations', '2026-03-12', 12, 'amber', 'waiting', 'Room 102', 'Dr. R. Malhotra', 2, false, 
'{
  "general": {
    "Blood Group": "O+",
    "BMI": "26.4",
    "DOB": "1984-08-15",
    "Emergency Contact": "Priya Sharma (+91 98765 43210)",
    "Known Allergies": "Penicillin, Sulfonamides",
    "Insurance ID": "AR-98742-IN"
  },
  "cardiology": {
    "Diagnosed Conditions": "Stage 1 Hypertension, Mild Hyperlipidemia",
    "Last ECG Date": "2026-03-12",
    "Current Medications": "Amlodipine 5mg QD, Atorvastatin 10mg HS",
    "Contraindicated Drugs": "NSAIDs (Ibuprofen), Pseudoephedrine"
  },
  "dermatology": {
    "Active Conditions": "Seborrheic Dermatitis (Scalp)",
    "Current Topical Treatments": "Ketoconazole 2% Shampoo",
    "Patch Test History": "Negative for standard patch series (2025)"
  },
  "prescriptions": [
    { "date": "2026-03-12", "doctor": "Dr. R. Malhotra", "medication": "Amlodipine", "dosage": "5mg QD", "status": "Filled" }
  ]
}'::jsonb,
'{
  "riskFlags": "Elevated cardiovascular risk based on 3-year hypertension history + current sodium intake.",
  "interventions": [
    "Initiate low-sodium diet and stress test referral.",
    "Monitor daily blood pressure logs.",
    "Review lipid panel in 6 weeks."
  ],
  "diet": {
    "recommended": ["Leafy greens", "Oats", "Salmon / Omega-3", "Garlic"],
    "restrict": ["Table salt", "Processed meat", "Caffeine", "Pickles"]
  }
}'::jsonb),
('P-15', '#A-15', 'Sunita Rao', 58, 'A-', 'Follow-up on post-operative cardiac rehab', '2026-05-20', 24, 'red', 'waiting', 'Room 105', 'Dr. S. Chatterjee', 2, false,
'{
  "general": {
    "Blood Group": "A-",
    "BMI": "24.1",
    "DOB": "1968-11-03",
    "Emergency Contact": "K. Rao (+91 98989 12345)",
    "Known Allergies": "Aspirin",
    "Insurance ID": "AR-12095-IN"
  },
  "cardiology": {
    "Diagnosed Conditions": "Coronary Artery Disease, CABG Post-Op (6 months)",
    "Last ECG Date": "2026-05-20",
    "Current Medications": "Clopidogrel 75mg QD, Metoprolol 25mg BID",
    "Contraindicated Drugs": "Sildenafil, High-dose Ibuprofen"
  },
  "dermatology": {
    "Active Conditions": "None",
    "Current Topical Treatments": "None",
    "Patch Test History": "N/A"
  },
  "prescriptions": [
    { "date": "2026-05-20", "doctor": "Dr. S. Chatterjee", "medication": "Clopidogrel", "dosage": "75mg QD", "status": "Filled" }
  ]
}'::jsonb,
'{
  "riskFlags": "Post-CABG recovery is stable. Monitor heart rate for bradycardia side-effects from Beta-blockers.",
  "interventions": [
    "Maintain daily aerobic walking program.",
    "Strict medication adherence check.",
    "Schedule echocardiogram at 1-year post-op mark."
  ],
  "diet": {
    "recommended": ["Olive oil", "Walnuts", "Spinach", "Blueberries"],
    "restrict": ["Butter / Saturated fat", "High sodium soups", "Coconut oil", "Red meat"]
  }
}'::jsonb),
('P-03', '#A-03', 'Vikram Malhotra', 31, 'B+', 'Acute skin rash and itching on forearms', '2026-01-10', 6, 'green', 'waiting', 'Room 201', 'Dr. A. Sen', 2, false,
'{
  "general": {
    "Blood Group": "B+",
    "BMI": "22.8",
    "DOB": "1995-04-22",
    "Emergency Contact": "Rita Malhotra (+91 91111 22222)",
    "Known Allergies": "Latex, Nickel",
    "Insurance ID": "AR-88349-IN"
  },
  "cardiology": {
    "Diagnosed Conditions": "None",
    "Last ECG Date": "N/A",
    "Current Medications": "None",
    "Contraindicated Drugs": "None"
  },
  "dermatology": {
    "Active Conditions": "Contact Dermatitis (Suspected Nickel exposure)",
    "Current Topical Treatments": "Hydrocortisone 1% Cream PRN",
    "Patch Test History": "Positive for Nickel Sulfate (2024)"
  },
  "prescriptions": [
    { "date": "2026-01-10", "doctor": "Dr. A. Sen", "medication": "Hydrocortisone", "dosage": "Apply thin layer BID", "status": "Filled" }
  ]
}'::jsonb,
'{
  "riskFlags": "Allergic contact dermatitis flare-up. Check for nickel buckle exposure.",
  "interventions": [
    "Avoid metal contacts directly on skin.",
    "Apply topical steroid cream as directed.",
    "Use hypoallergenic soaps and cleansers."
  ],
  "diet": {
    "recommended": ["Probiotic yogurt", "Green tea", "Turmeric", "Watermelon"],
    "restrict": ["Canned foods", "Cocoa / Dark chocolate", "Soybeans", "Nuts"]
  }
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  token = EXCLUDED.token,
  name = EXCLUDED.name,
  age = EXCLUDED.age,
  blood_group = EXCLUDED.blood_group,
  visit_reason = EXCLUDED.visit_reason,
  last_visit = EXCLUDED.last_visit,
  wait_duration = EXCLUDED.wait_duration,
  urgency = EXCLUDED.urgency,
  status = EXCLUDED.status,
  room = EXCLUDED.room,
  doctor = EXCLUDED.doctor,
  timeline_step = EXCLUDED.timeline_step,
  privacy_granted = EXCLUDED.privacy_granted,
  medical_vault = EXCLUDED.medical_vault,
  ai_insights = EXCLUDED.ai_insights;

-- Seed Tickets
INSERT INTO public.tickets (id, token, patient_name, doctor_id, prescription_summary, timestamp, status, started_at, pharmacist, completed_at) VALUES
('T-1', '#A-08', 'Meera Nair', 'Dr. A. Sen', 'Montelukast 10mg + Cetirizine 10mg', '14:15', 'incoming', NULL, NULL, NULL),
('T-2', '#A-11', 'Rahul Verma', 'Dr. R. Malhotra', 'Metformin 500mg BID', '14:05', 'preparation', '14:12', 'Rohan', NULL),
('T-3', '#A-02', 'Karan Johar', 'Dr. S. Chatterjee', 'Atorvastatin 20mg + Aspirin 75mg', '13:50', 'completed', NULL, NULL, '14:08')
ON CONFLICT (id) DO UPDATE SET
  token = EXCLUDED.token,
  patient_name = EXCLUDED.patient_name,
  doctor_id = EXCLUDED.doctor_id,
  prescription_summary = EXCLUDED.prescription_summary,
  timestamp = EXCLUDED.timestamp,
  status = EXCLUDED.status,
  started_at = EXCLUDED.started_at,
  pharmacist = EXCLUDED.pharmacist,
  completed_at = EXCLUDED.completed_at;

-- Seed Emergency SOS
INSERT INTO public.emergency_sos (id, sos_state, phase, countdown, selected_ambulance, selected_hospital) VALUES
(1, 'inactive', 0, 0, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  sos_state = EXCLUDED.sos_state,
  phase = EXCLUDED.phase,
  countdown = EXCLUDED.countdown,
  selected_ambulance = EXCLUDED.selected_ambulance,
  selected_hospital = EXCLUDED.selected_hospital;
