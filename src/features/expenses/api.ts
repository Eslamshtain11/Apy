import { supabase } from '../../lib/supabase';
import type { Expense } from '../../types/db';

export type ExpenseRecord = Expense;

const ensureClient = () => {
  if (!supabase) {
    throw new Error('لم يتم تهيئة عميل Supabase.');
  }
  return supabase;
};

const normalizeExpense = (expense: any): ExpenseRecord => ({
  id: expense.id,
  description: expense.description,
  amount: Number(expense.amount ?? 0),
  spent_at: expense.spent_at ?? expense.date ?? new Date().toISOString().slice(0, 10),
  created_at: expense.created_at ?? new Date().toISOString()
});

export const fetchAllExpenses = async (): Promise<ExpenseRecord[]> => {
  const client = ensureClient();
  const { data, error } = await client
    .from('expenses')
    .select('id, description, amount, spent_at, created_at')
    .order('spent_at', { ascending: false });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map(normalizeExpense);
};

export const createExpense = async (input: {
  description: string;
  amount: number;
  spent_at: string;
}): Promise<ExpenseRecord> => {
  const client = ensureClient();
  const { data, error } = await client
    .from('expenses')
    .insert({ description: input.description, amount: input.amount, spent_at: input.spent_at })
    .select('id, description, amount, spent_at, created_at')
    .single();

  if (error) {
    throw error;
  }

  return normalizeExpense(data);
};

export const updateExpense = async (
  id: string,
  input: { description: string; amount: number; spent_at: string }
): Promise<ExpenseRecord> => {
  const client = ensureClient();
  const { data, error } = await client
    .from('expenses')
    .update({ description: input.description, amount: input.amount, spent_at: input.spent_at })
    .eq('id', id)
    .select('id, description, amount, spent_at, created_at')
    .single();

  if (error) {
    throw error;
  }

  return normalizeExpense(data);
};

export const deleteExpense = async (id: string): Promise<void> => {
  const client = ensureClient();
  const { error } = await client.from('expenses').delete().eq('id', id);

  if (error) {
    throw error;
  }
};
