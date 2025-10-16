import { supabase, getUserId } from '../../lib/supabase';
import type { Expense } from '../../types/db';

export type ExpenseRecord = Expense;

const normalizeExpense = (expense: any): ExpenseRecord => ({
  id: expense.id,
  description: expense.description,
  amount: Number(expense.amount ?? 0),
  spent_at: expense.spent_at ?? expense.date ?? new Date().toISOString().slice(0, 10),
  created_at: expense.created_at ?? new Date().toISOString()
});

export const fetchAllExpenses = async (userId?: string): Promise<ExpenseRecord[]> => {
  const ownerId = userId ?? (await getUserId());
  const { data, error } = await supabase
    .from('expenses')
    .select('id, description, amount, spent_at, created_at')
    .eq('user_id', ownerId)
    .order('spent_at', { ascending: false });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map(normalizeExpense);
};

export const createExpense = async (
  input: {
    description: string;
    amount: number;
    spent_at: string;
  },
  userId?: string
): Promise<ExpenseRecord> => {
  const ownerId = userId ?? (await getUserId());
  const { data, error } = await supabase
    .from('expenses')
    .insert({ description: input.description, amount: input.amount, spent_at: input.spent_at, user_id: ownerId })
    .select('id, description, amount, spent_at, created_at')
    .single();

  if (error) {
    throw error;
  }

  return normalizeExpense(data);
};

export const updateExpense = async (
  id: string,
  input: { description: string; amount: number; spent_at: string },
  userId?: string
): Promise<ExpenseRecord> => {
  const ownerId = userId ?? (await getUserId());
  const { data, error } = await supabase
    .from('expenses')
    .update({ description: input.description, amount: input.amount, spent_at: input.spent_at })
    .eq('user_id', ownerId)
    .eq('id', id)
    .select('id, description, amount, spent_at, created_at')
    .single();

  if (error) {
    throw error;
  }

  return normalizeExpense(data);
};

export const deleteExpense = async (id: string, userId?: string): Promise<void> => {
  const ownerId = userId ?? (await getUserId());
  const { error } = await supabase.from('expenses').delete().eq('user_id', ownerId).eq('id', id);

  if (error) {
    throw error;
  }
};

