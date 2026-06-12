import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env manually
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://opdnvcppsoeaswswnffm.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('No Supabase key found in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const patientsToCreate = [
  {
    email: 'patient1@arogyaflow.com',
    password: 'ArogyaPatient1!',
    name: 'Aarav Mehta',
    age: 34,
    blood_group: 'O+',
    visit_reason: 'Chronic lower back pain and stiffness in the mornings',
    last_visit: '2026-04-10',
    wait_duration: 15,
    urgency: 'green',
    medical_vault: {
      general: {
        "Blood Group": "O+",
        "BMI": "24.2",
        "DOB": "1992-05-14",
        "Emergency Contact": "Meera Mehta (+91 98765 11111)",
        "Known Allergies": "Sulfa drugs",
        "Insurance ID": "AR-90111-IN"
      },
      cardiology: {
        "Diagnosed Conditions": "None",
        "Last ECG Date": "N/A",
        "Current Medications": "None",
        "Contraindicated Drugs": "None"
      },
      dermatology: {
        "Active Conditions": "None",
        "Current Topical Treatments": "None",
        "Patch Test History": "N/A"
      },
      prescriptions: []
    },
    ai_insights: {
      riskFlags: "Musculoskeletal strain. Low risk of systemic disease. Avoid heavy lifting.",
      interventions: [
        "Referral to physical therapy.",
        "Ergonomic workspace assessment.",
        "Daily stretching routine."
      ],
      diet: {
        recommended: ["Turmeric milk", "Ginger tea", "Walnuts", "Spinach"],
        restrict: ["Refined sugar", "Processed snacks", "Excess caffeine"]
      }
    }
  },
  {
    email: 'patient2@arogyaflow.com',
    password: 'ArogyaPatient2!',
    name: 'Zara Khan',
    age: 27,
    blood_group: 'AB-',
    visit_reason: 'Severe migraine episodes with aura and sensitivity to light',
    last_visit: '2026-05-02',
    wait_duration: 8,
    urgency: 'amber',
    medical_vault: {
      general: {
        "Blood Group": "AB-",
        "BMI": "21.5",
        "DOB": "1999-09-21",
        "Emergency Contact": "Asif Khan (+91 98765 22222)",
        "Known Allergies": "Aspirin, Ibuprofen",
        "Insurance ID": "AR-90222-IN"
      },
      cardiology: {
        "Diagnosed Conditions": "None",
        "Last ECG Date": "N/A",
        "Current Medications": "Sumatriptan 50mg PRN",
        "Contraindicated Drugs": "Ergotamine"
      },
      dermatology: {
        "Active Conditions": "None",
        "Current Topical Treatments": "None",
        "Patch Test History": "N/A"
      },
      prescriptions: []
    },
    ai_insights: {
      riskFlags: "Frequent migraine attacks. Monitor trigger patterns (sleep, diet, light).",
      interventions: [
        "Maintain a headache diary.",
        "Ensure consistent 8-hour sleep cycle.",
        "Screen time reduction limits."
      ],
      diet: {
        recommended: ["Magnesium-rich foods (Avocados, Bananas)", "Water (3L daily)", "CoQ10 supplements"],
        restrict: ["Aged cheeses", "Chocolate", "Monosodium Glutamate (MSG)", "Red wine"]
      }
    }
  },
  {
    email: 'patient3@arogyaflow.com',
    password: 'ArogyaPatient3!',
    name: 'Amit Patel',
    age: 49,
    blood_group: 'A+',
    visit_reason: 'Management and routine review of Type 2 Diabetes',
    last_visit: '2026-03-20',
    wait_duration: 25,
    urgency: 'amber',
    medical_vault: {
      general: {
        "Blood Group": "A+",
        "BMI": "28.7",
        "DOB": "1977-01-12",
        "Emergency Contact": "Sarla Patel (+91 98765 33333)",
        "Known Allergies": "None",
        "Insurance ID": "AR-90333-IN"
      },
      cardiology: {
        "Diagnosed Conditions": "Mild Hypercholesterolemia",
        "Last ECG Date": "2026-03-20",
        "Current Medications": "Metformin 500mg BID, Atorvastatin 10mg HS",
        "Contraindicated Drugs": "Systemic corticosteroids"
      },
      dermatology: {
        "Active Conditions": "Xerosis (Dry Skin) on lower legs",
        "Current Topical Treatments": "Urea 10% cream daily",
        "Patch Test History": "N/A"
      },
      prescriptions: []
    },
    ai_insights: {
      riskFlags: "Elevated HbA1c history. High risk of diabetic neuropathy and retinopathy. Monitor foot health.",
      interventions: [
        "Regular podiatry foot examinations.",
        "Annual dilated eye exam.",
        "HbA1c test check in 4 weeks."
      ],
      diet: {
        recommended: ["Fenugreek seeds", "Brown rice / Quinoa", "Bitter gourd", "High-fiber veggies"],
        restrict: ["White bread", "Sweet beverages", "Potatoes", "Deep-fried foods"]
      }
    }
  },
  {
    email: 'patient4@arogyaflow.com',
    password: 'ArogyaPatient4!',
    name: 'Priya Nair',
    age: 52,
    blood_group: 'B-',
    visit_reason: 'Thyroid panel follow-up and persistent fatigue',
    last_visit: '2026-04-18',
    wait_duration: 18,
    urgency: 'green',
    medical_vault: {
      general: {
        "Blood Group": "B-",
        "BMI": "23.8",
        "DOB": "1974-06-30",
        "Emergency Contact": "Ramesh Nair (+91 98765 44444)",
        "Known Allergies": "Peanuts",
        "Insurance ID": "AR-90444-IN"
      },
      cardiology: {
        "Diagnosed Conditions": "None",
        "Last ECG Date": "N/A",
        "Current Medications": "Levothyroxine 75mcg QD",
        "Contraindicated Drugs": "Calcium carbonate supplements within 4 hours of Levothyroxine"
      },
      dermatology: {
        "Active Conditions": "Dry skin and brittle nails",
        "Current Topical Treatments": "Moisturizing lotions",
        "Patch Test History": "N/A"
      },
      prescriptions: []
    },
    ai_insights: {
      riskFlags: "Hypothyroidism management. Monitor TSH levels for dose titration.",
      interventions: [
        "Take Levothyroxine on an empty stomach 30-60 min before breakfast.",
        "Check TSH, Free T3/T4 in 2 weeks.",
        "Track fatigue patterns."
      ],
      diet: {
        recommended: ["Iodized salt", "Eggs", "Brazil nuts (Selenium)", "Fish"],
        restrict: ["Excess raw cruciferous vegetables (Cabbage, Broccoli)", "Soy products", "Unfiltered tap water"]
      }
    }
  },
  {
    email: 'patient5@arogyaflow.com',
    password: 'ArogyaPatient5!',
    name: 'Rahul Sharma',
    age: 19,
    blood_group: 'O-',
    visit_reason: 'Acute seasonal asthma flare-up with wheezing',
    last_visit: '2026-05-10',
    wait_duration: 35,
    urgency: 'red',
    medical_vault: {
      general: {
        "Blood Group": "O-",
        "BMI": "20.1",
        "DOB": "2007-02-18",
        "Emergency Contact": "Sunita Sharma (+91 98765 55555)",
        "Known Allergies": "Dust mites, Pollen",
        "Insurance ID": "AR-90555-IN"
      },
      cardiology: {
        "Diagnosed Conditions": "None",
        "Last ECG Date": "N/A",
        "Current Medications": "Albuterol inhaler PRN, Fluticasone daily",
        "Contraindicated Drugs": "Beta-blockers (Propranolol)"
      },
      dermatology: {
        "Active Conditions": "Mild Atopic Eczema on inner elbows",
        "Current Topical Treatments": "Tacrolimus ointment PRN",
        "Patch Test History": "N/A"
      },
      prescriptions: []
    },
    ai_insights: {
      riskFlags: "Acute asthma bronchospasm danger. Elevated emergency risk during high pollen seasons.",
      interventions: [
        "Carry rescue inhaler at all times.",
        "Monitor peak flow readings morning and night.",
        "Avoid outdoor activities on high-pollen days."
      ],
      diet: {
        recommended: ["Apples (flavonoids)", "Oranges / Vitamin C", "Flaxseeds", "Warm herbal tea"],
        restrict: ["Sulfites (dried fruits, processed juices)", "Cold beverages", "Ice cream"]
      }
    }
  },
  {
    email: 'patient6@arogyaflow.com',
    password: 'ArogyaPatient6!',
    name: 'Sneha Rao',
    age: 41,
    blood_group: 'B+',
    visit_reason: 'Persistent skin eczema flare-up on wrists and forearms',
    last_visit: '2026-02-15',
    wait_duration: 10,
    urgency: 'green',
    medical_vault: {
      general: {
        "Blood Group": "B+",
        "BMI": "22.3",
        "DOB": "1985-11-12",
        "Emergency Contact": "Vasant Rao (+91 98765 66666)",
        "Known Allergies": "Latex, Fragrance mixes",
        "Insurance ID": "AR-90666-IN"
      },
      cardiology: {
        "Diagnosed Conditions": "None",
        "Last ECG Date": "N/A",
        "Current Medications": "None",
        "Contraindicated Drugs": "None"
      },
      dermatology: {
        "Active Conditions": "Atopic Dermatitis (Wrists, forearms)",
        "Current Topical Treatments": "Mometasone furoate 0.1% cream BID",
        "Patch Test History": "Positive for Fragrance Mix I (2025)"
      },
      prescriptions: []
    },
    ai_insights: {
      riskFlags: "Eczema flare-up triggered by contact irritants or dry weather. High skin sensitivity.",
      interventions: [
        "Use fragrance-free mild soap and moisturizers.",
        "Apply topical steroids only to active patches.",
        "Wear breathable cotton clothing."
      ],
      diet: {
        recommended: ["Fatty fish (Salmon)", "Probiotic yogurt", "Green tea", "Turmeric"],
        restrict: ["Dairy products", "Eggs", "Gluten", "Processed snacks"]
      }
    }
  },
  {
    email: 'patient7@arogyaflow.com',
    password: 'ArogyaPatient7!',
    name: 'Kabir Singh',
    age: 63,
    blood_group: 'A-',
    visit_reason: 'Moderate knee joint pain and osteoarthritis check',
    last_visit: '2026-03-29',
    wait_duration: 12,
    urgency: 'green',
    medical_vault: {
      general: {
        "Blood Group": "A-",
        "BMI": "29.4",
        "DOB": "1963-04-05",
        "Emergency Contact": "Harpreet Singh (+91 98765 77777)",
        "Known Allergies": "Penicillin",
        "Insurance ID": "AR-90777-IN"
      },
      cardiology: {
        "Diagnosed Conditions": "Mild Atherosclerosis",
        "Last ECG Date": "2026-03-29",
        "Current Medications": "Atorvastatin 20mg HS, Glucosamine 1500mg QD",
        "Contraindicated Drugs": "High-dose chronic NSAIDs due to gastrointestinal risk"
      },
      dermatology: {
        "Active Conditions": "None",
        "Current Topical Treatments": "None",
        "Patch Test History": "N/A"
      },
      prescriptions: []
    },
    ai_insights: {
      riskFlags: "Osteoarthritis progression. High BMI loading excess weight on knee joints.",
      interventions: [
        "Moderate, low-impact exercise (swimming or stationary cycling).",
        "Weight management guidance referral.",
        "Apply warm compresses to relieve stiffness."
      ],
      diet: {
        recommended: ["Walnuts / Chia seeds", "Berries", "Olive oil", "Bone broth"],
        restrict: ["Refined sugars", "Saturated fats", "Excessive red meat"]
      }
    }
  },
  {
    email: 'patient8@arogyaflow.com',
    password: 'ArogyaPatient8!',
    name: 'Neha Gupta',
    age: 28,
    blood_group: 'AB+',
    visit_reason: 'Recurrent acid reflux, heartburn, and bloating',
    last_visit: '2026-05-15',
    wait_duration: 5,
    urgency: 'green',
    medical_vault: {
      general: {
        "Blood Group": "AB+",
        "BMI": "23.0",
        "DOB": "1998-08-08",
        "Emergency Contact": "Suresh Gupta (+91 98765 88888)",
        "Known Allergies": "Shellfish",
        "Insurance ID": "AR-90888-IN"
      },
      cardiology: {
        "Diagnosed Conditions": "None",
        "Last ECG Date": "N/A",
        "Current Medications": "Omeprazole 20mg daily PRN",
        "Contraindicated Drugs": "NSAIDs (irritate stomach lining)"
      },
      dermatology: {
        "Active Conditions": "None",
        "Current Topical Treatments": "None",
        "Patch Test History": "N/A"
      },
      prescriptions: []
    },
    ai_insights: {
      riskFlags: "Gastroesophageal Reflux Disease (GERD) symptoms. High correlation with eating patterns.",
      interventions: [
        "Avoid lying down for 3 hours after eating.",
        "Eat smaller, more frequent meals.",
        "Elevate head of bed by 6 inches."
      ],
      diet: {
        recommended: ["Oatmeal", "Melons / Bananas", "Fennel seeds", "Chamomile tea"],
        restrict: ["Spicy foods", "Citrus fruits", "Tomatoes / Pasta sauce", "Chocolate", "Peppermint"]
      }
    }
  },
  {
    email: 'patient9@arogyaflow.com',
    password: 'ArogyaPatient9!',
    name: 'Vikram Sen',
    age: 71,
    blood_group: 'O+',
    visit_reason: 'Routine geriatric health assessment and blood pressure review',
    last_visit: '2026-01-20',
    wait_duration: 30,
    urgency: 'amber',
    medical_vault: {
      general: {
        "Blood Group": "O+",
        "BMI": "25.7",
        "DOB": "1955-12-05",
        "Emergency Contact": "Rohit Sen (+91 98765 99999)",
        "Known Allergies": "Sulfonamides",
        "Insurance ID": "AR-90999-IN"
      },
      cardiology: {
        "Diagnosed Conditions": "Essential Hypertension, Mild Bradycardia",
        "Last ECG Date": "2026-01-20",
        "Current Medications": "Losartan 50mg daily QD",
        "Contraindicated Drugs": "Beta-blockers (due to baseline bradycardia)"
      },
      dermatology: {
        "Active Conditions": "Pruritus senilis (dry itchy skin)",
        "Current Topical Treatments": "Emollient creams daily",
        "Patch Test History": "N/A"
      },
      prescriptions: []
    },
    ai_insights: {
      riskFlags: "Geriatric fall risk. Monitor blood pressure for orthostatic hypotension.",
      interventions: [
        "Change positions slowly (sit to stand).",
        "Maintain adequate hydration.",
        "Home hazard safety review."
      ],
      diet: {
        recommended: ["High-fiber grains", "Eggs / Lean proteins", "Avocados", "Garlic"],
        restrict: ["Excess table salt", "Processed meats", "High-sugar foods"]
      }
    }
  },
  {
    email: 'patient10@arogyaflow.com',
    password: 'ArogyaPatient10!',
    name: 'Ananya Das',
    age: 32,
    blood_group: 'A-',
    visit_reason: 'Severe seasonal allergic rhinitis, sneezing, and watery eyes',
    last_visit: '2026-05-28',
    wait_duration: 14,
    urgency: 'green',
    medical_vault: {
      general: {
        "Blood Group": "A-",
        "BMI": "21.9",
        "DOB": "1994-03-17",
        "Emergency Contact": "Subrata Das (+91 98765 00000)",
        "Known Allergies": "Pollen, Animal dander",
        "Insurance ID": "AR-90000-IN"
      },
      cardiology: {
        "Diagnosed Conditions": "None",
        "Last ECG Date": "N/A",
        "Current Medications": "Cetirizine 10mg daily PRN, Fluticasone nasal spray QD",
        "Contraindicated Drugs": "Decongestants with active hypertension (N/A here)"
      },
      dermatology: {
        "Active Conditions": "None",
        "Current Topical Treatments": "None",
        "Patch Test History": "N/A"
      },
      prescriptions: []
    },
    ai_insights: {
      riskFlags: "Severe allergic rhinitis flare. High susceptibility to secondary sinus infections.",
      interventions: [
        "Use saline nasal rinses daily.",
        "Keep windows closed during high-pollen hours.",
        "Wash hair after spending time outdoors."
      ],
      diet: {
        recommended: ["Ginger", "Local raw honey", "Citrus fruits", "Turmeric"],
        restrict: ["Aged cheeses", "Cured meats", "Fermented foods (high histamine)"]
      }
    }
  }
];

async function seed() {
  console.log('Starting Supabase Seeding Process for 10 Patients...\n');
  
  const credentialList = [];
  
  for (let i = 0; i < patientsToCreate.length; i++) {
    const p = patientsToCreate[i];
    console.log(`[${i+1}/10] Processing ${p.name} (${p.email})...`);
    
    try {
      // 1. Attempt to sign up the patient
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: p.email,
        password: p.password,
        options: {
          data: {
            name: p.name,
            role: 'patient'
          }
        }
      });
      
      let userId;
      if (authError) {
        // If user already exists, let's fetch/guess the user ID or try to sign in
        if (authError.message.includes('already registered') || authError.status === 422) {
          console.warn(` - User is already registered. Attempting to retrieve profile...`);
          // Let's query the profiles table for this email
          const { data: profData, error: profError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', p.email)
            .maybeSingle();
            
          if (profError || !profData) {
            console.error(` - Error retrieving existing user profile: ${profError?.message || 'Not found'}`);
            continue;
          }
          userId = profData.id;
          console.log(` - Found existing user ID: ${userId}`);
        } else {
          console.error(` - Signup failed: ${authError.message}`);
          continue;
        }
      } else {
        userId = authData.user?.id;
        console.log(` - Signed up successfully. User ID: ${userId}`);
      }
      
      if (!userId) {
        console.error(` - Could not resolve user ID for ${p.email}`);
        continue;
      }
      
      // 2. Ensure profile is updated (triggers usually handle this, but let's make sure role is correct)
      await supabase.from('profiles').upsert({
        id: userId,
        email: p.email,
        role: 'patient',
        name: p.name
      }, { onConflict: 'id' });
      
      // 3. Populate clinical data in public.patients table
      const token = `#P-${String(i+1).padStart(2, '0')}`;
      const patientRecord = {
        id: userId,
        token: token,
        name: p.name,
        age: p.age,
        blood_group: p.blood_group,
        visit_reason: p.visit_reason,
        last_visit: p.last_visit,
        wait_duration: p.wait_duration,
        urgency: p.urgency,
        status: 'waiting',
        room: 'Room 105', // Default room
        doctor: 'Dr. S. Chatterjee', // Default doctor
        timeline_step: 2,
        privacy_granted: false,
        medical_vault: p.medical_vault,
        ai_insights: p.ai_insights
      };
      
      const { error: patientError } = await supabase
        .from('patients')
        .upsert(patientRecord, { onConflict: 'id' });
        
      if (patientError) {
        console.error(` - Error inserting clinical patient details: ${patientError.message}`);
      } else {
        console.log(` - Successfully populated clinical data & token ${token}`);
      }
      
      credentialList.push({
        Token: token,
        Name: p.name,
        Age: p.age,
        Blood: p.blood_group,
        Email: p.email,
        Password: p.password
      });
      
    } catch (err) {
      console.error(` - Exception for ${p.email}:`, err);
    }
    console.log('');
  }
  
  console.log('Seeding process finished.\n');
  
  // Write the credentials document
  const docPath = 'patient_credentials.md';
  let docContent = `# Patient Credentials & Clinical Test Accounts\n\n`;
  docContent += `These patient accounts have been registered in Supabase Auth, profiles, and patients tables. You can use these credentials to log in to the Patient Portal online.\n\n`;
  docContent += `| Token | Patient Name | Age | Blood Group | Login Email | Password |\n`;
  docContent += `| --- | --- | --- | --- | --- | --- |\n`;
  
  credentialList.forEach(c => {
    docContent += `| \`${c.Token}\` | **${c.Name}** | ${c.Age} | \`${c.Blood}\` | \`${c.Email}\` | \`${c.Password}\` |\n`;
  });
  
  docContent += `\n\n> [!NOTE]\n`;
  docContent += `> All patients have been seeded into the active waiting queue (status: \`waiting\`, step: \`2\`) and assigned to **Dr. S. Chatterjee** in **Room 105**. You can log into the Doctor Module with your doctor account to see them in your waiting queue, diagnose them, write prescriptions, and compile them into PDFs!\n`;
  
  fs.writeFileSync(docPath, docContent, 'utf-8');
  console.log(`Credentials document successfully written to: ${docPath}\n`);
}

seed();
