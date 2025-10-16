import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anon key must be provided via environment variables.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export const getCurrentUser = async (): Promise<User | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user ?? null;
};

export const getUserId = async (): Promise<string> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('unauthorized');
  }
  return user.id;
};

