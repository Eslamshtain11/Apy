import { supabase, getUserId } from '../../lib/supabase';

export interface GuestCodeRecord {
  id: string;
  code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
}

export const fetchActiveGuestCode = async (userId?: string): Promise<GuestCodeRecord | null> => {
  const ownerId = userId ?? (await getUserId());
  const { data, error } = await supabase
    .from('guest_codes')
    .select('id, code, active, created_at, updated_at, expires_at')
    .eq('user_id', ownerId)
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

export const generateGuestCode = async (code: string, userId?: string): Promise<GuestCodeRecord> => {
  const ownerId = userId ?? (await getUserId());
  const normalized = code.trim().toUpperCase();

  if (!normalized) {
    throw new Error('الكود الجديد مطلوب.');
  }

  const { error: deactivateError } = await supabase
    .from('guest_codes')
    .update({ active: false })
    .eq('user_id', ownerId)
    .eq('active', true);
  if (deactivateError) {
    throw deactivateError;
  }

  const { data, error } = await supabase
    .from('guest_codes')
    .insert({ code: normalized, active: true, user_id: ownerId })
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

export const deactivateGuestCodes = async (userId?: string): Promise<void> => {
  const ownerId = userId ?? (await getUserId());
  const { error } = await supabase
    .from('guest_codes')
    .update({ active: false })
    .eq('user_id', ownerId)
    .eq('active', true);

  if (error) {
    throw error;
  }
};

export const verifyGuestCode = async (code: string): Promise<boolean> => {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;

  const { data, error } = await supabase
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

