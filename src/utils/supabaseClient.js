import { createClient } from '@supabase/supabase-js';

// Resolve configuration credentials from LocalStorage or Vite Environment variables
export function getSupabaseConfig() {
  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_key');

  const url = localUrl || import.meta.env.VITE_SUPABASE_URL || '';
  const key = localKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  return { url: url.trim(), key: key.trim() };
}

export function setSupabaseConfig(url, key) {
  if (url) localStorage.setItem('supabase_url', url.trim());
  else localStorage.removeItem('supabase_url');

  if (key) localStorage.setItem('supabase_key', key.trim());
  else localStorage.removeItem('supabase_key');
}

export function clearSupabaseConfig() {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_key');
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseConfig();
  return !!(url && key);
}

// Initialize supabase client if configured
let supabaseInstance = null;
const { url, key } = getSupabaseConfig();
if (url && key) {
  try {
    supabaseInstance = createClient(url, key);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export const supabase = supabaseInstance;

// Helper to test if connection works (correct credentials & table exists)
export async function checkSupabaseConnection() {
  if (typeof window !== 'undefined' && localStorage.getItem('aarogyasetu_force_sandbox') === 'true') {
    return false;
  }
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id')
      .limit(1);
    
    if (error) {
      console.warn('Supabase ping failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase connection test exception:', err);
    return false;
  }
}
