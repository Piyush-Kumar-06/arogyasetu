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

const patientsToUpdate = [
  { email: 'patient1@arogyaflow.com', name: 'Aarav Mehta', oldPassword: 'ArogyaPatient1!' },
  { email: 'patient2@arogyaflow.com', name: 'Zara Khan', oldPassword: 'ArogyaPatient2!' },
  { email: 'patient3@arogyaflow.com', name: 'Amit Patel', oldPassword: 'ArogyaPatient3!' },
  { email: 'patient4@arogyaflow.com', name: 'Priya Nair', oldPassword: 'ArogyaPatient4!' },
  { email: 'patient5@arogyaflow.com', name: 'Rahul Sharma', oldPassword: 'ArogyaPatient5!' },
  { email: 'patient6@arogyaflow.com', name: 'Sneha Rao', oldPassword: 'ArogyaPatient6!' },
  { email: 'patient7@arogyaflow.com', name: 'Kabir Singh', oldPassword: 'ArogyaPatient7!' },
  { email: 'patient8@arogyaflow.com', name: 'Neha Gupta', oldPassword: 'ArogyaPatient8!' },
  { email: 'patient9@arogyaflow.com', name: 'Vikram Sen', oldPassword: 'ArogyaPatient9!' },
  { email: 'patient10@arogyaflow.com', name: 'Ananya Das', oldPassword: 'ArogyaPatient10!' }
];

const newPassword = 'pass123';

async function updateAll() {
  console.log(`Updating passwords for 10 patients to "${newPassword}"...\n`);
  
  for (let i = 0; i < patientsToUpdate.length; i++) {
    const p = patientsToUpdate[i];
    console.log(`[${i+1}/10] Logging in as ${p.name} (${p.email})...`);
    
    try {
      // 1. Sign in with the old password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: p.email,
        password: p.oldPassword
      });
      
      if (signInError) {
        // Check if password was already changed
        console.warn(` - Could not log in with old password: ${signInError.message}. checking if already updated...`);
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: p.email,
          password: newPassword
        });
        if (retryError) {
          console.error(` - Error: Unable to log in with old or new password.`);
        } else {
          console.log(` - Password was already updated successfully!`);
          await supabase.auth.signOut();
        }
        continue;
      }
      
      console.log(` - Logged in successfully. Updating password to "${newPassword}"...`);
      
      // 2. Update the user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        console.error(` - Failed to update password: ${updateError.message}`);
      } else {
        console.log(` - Successfully updated password to "${newPassword}"`);
      }
      
      // 3. Sign out to clean up session
      await supabase.auth.signOut();
      
    } catch (err) {
      console.error(` - Exception for ${p.email}:`, err);
    }
    console.log('');
  }
  
  console.log('Password update finished. Re-writing patient_credentials.md...\n');
  
  // Update credentials document content
  const docPath = 'patient_credentials.md';
  let docContent = `# Patient Credentials & Clinical Test Accounts\n\n`;
  docContent += `These patient accounts have been registered in Supabase Auth, profiles, and patients tables. You can use these credentials to log in to the Patient Portal online.\n\n`;
  docContent += `| Token | Patient Name | Login Email | Password |\n`;
  docContent += `| --- | --- | --- | --- |\n`;
  
  patientsToUpdate.forEach((p, idx) => {
    const token = `#P-${String(idx+1).padStart(2, '0')}`;
    docContent += `| \`${token}\` | **${p.name}** | \`${p.email}\` | \`${newPassword}\` |\n`;
  });
  
  docContent += `\n\n> [!NOTE]\n`;
  docContent += `> All patients have been seeded into the active waiting queue (status: \`waiting\`, step: \`2\`) and assigned to **Dr. S. Chatterjee** in **Room 105**. You can log into the Doctor Module with your doctor account to see them in your waiting queue, diagnose them, write prescriptions, and compile them into PDFs!\n`;
  
  fs.writeFileSync(docPath, docContent, 'utf-8');
  console.log(`Credentials document successfully updated: ${docPath}\n`);
}

updateAll();
