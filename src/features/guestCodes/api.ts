import { supabase } from '../../lib/supabase';

export interface GuestCodeRecord {
  id: string;
  code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
}

const ensureClient = () => {
  if (!supabase) {
    throw new Error('لم يتم تهيئة عميل Supabase.');
  }
  return supabase;
};

export const fetchActiveGuestCode = async (): Promise<GuestCodeRecord | null> => {
  const client = ensureClient();
  const { data, error } = await client
    .from('guest_codes')
    .select('id, code, active, created_at, updated_at, expires_at')
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    updated_at: data.updated_at ?? data.created_at
  } as GuestCodeRecord;
};

export const generateGuestCode = async (code: string): Promise<GuestCodeRecord> => {
  const client = ensureClient();
  const normalized = code.trim().toUpperCase();

  if (!normalized) {
    throw new Error('الكود الجديد مطلوب.');
  }

  const { error: deactivateError } = await client.from('guest_codes').update({ active: false }).eq('active', true);
  if (deactivateError) {
    throw deactivateError;
  }

  const { data, error } = await client
    .from('guest_codes')
    .insert({ code: normalized, active: true })
    .select('id, code, active, created_at, updated_at, expires_at')
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    updated_at: data.updated_at ?? data.created_at
  } as GuestCodeRecord;
};

export const deactivateGuestCodes = async (): Promise<void> => {
  const client = ensureClient();
  const { error } = await client.from('guest_codes').update({ active: false }).eq('active', true);

  if (error) {
    throw error;
  }
};

export const verifyGuestCode = async (code: string): Promise<boolean> => {
  const client = ensureClient();
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;

  const { data, error } = await client
    .from('guest_codes')
    .select('code, active')
    .eq('code', normalized)
    .eq('active', true)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return Boolean(data?.active);
};
