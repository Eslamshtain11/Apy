import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://gegguiacbatjjbndgifs.supabase.co';
const fallbackAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZ2d1aWFjYmF0ampibmRnaWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDc2MjAsImV4cCI6MjA3NjEyMzYyMH0.b07F-sjehvEciHD7aMXjhUKcRFUUtwaLfZ8B8xHVX90';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? fallbackUrl;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? fallbackAnonKey;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false
        }
      })
    : null;
