import { supabase } from '../../lib/supabase';
import { guestCode as fallbackGuestCode } from '../../data/mockData';

export interface GuestCodeRecord {
  id: string;
  code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
}

const defaultRecord: GuestCodeRecord = {
  id: 'local-guest-code',
  code: fallbackGuestCode.code,
  active: true,
  created_at: fallbackGuestCode.updatedAt,
  updated_at: fallbackGuestCode.updatedAt,
  expires_at: null
};

const hasSupabase = Boolean(supabase);

export const fetchActiveGuestCode = async (): Promise<GuestCodeRecord> => {
  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('guest_codes')
        .select('id, code, active, created_at, updated_at, expires_at')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('failed to load guest code', error);
      }

      if (data) {
        return {
          ...data,
          updated_at: data.updated_at ?? data.created_at
        } as GuestCodeRecord;
      }
    } catch (error) {
      console.error('failed to load guest code', error);
    }
  }

  return { ...defaultRecord };
};

export const generateGuestCode = async (code: string): Promise<GuestCodeRecord> => {
  const normalized = code.trim().toUpperCase();
  if (hasSupabase && supabase) {
    try {
      await supabase.from('guest_codes').update({ active: false }).eq('active', true);
      const { data, error } = await supabase
        .from('guest_codes')
        .insert({ code: normalized, active: true })
        .select('id, code, active, created_at, updated_at, expires_at')
        .single();

      if (error) {
        console.error('failed to generate guest code', error);
        throw error;
      }

      if (data) {
        return {
          ...data,
          updated_at: data.updated_at ?? data.created_at
        } as GuestCodeRecord;
      }
    } catch (error) {
      console.error('failed to generate guest code', error);
      throw error;
    }
  }

  return {
    ...defaultRecord,
    id: `local-${Date.now()}`,
    code: normalized || defaultRecord.code,
    updated_at: new Date().toISOString()
  };
};

export const deactivateGuestCodes = async (): Promise<void> => {
  if (hasSupabase && supabase) {
    try {
      await supabase.from('guest_codes').update({ active: false }).eq('active', true);
    } catch (error) {
      console.error('failed to deactivate guest codes', error);
    }
  }
};
