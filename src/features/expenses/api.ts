import { supabase } from '../../lib/supabase';
import { expenses as mockExpenses } from '../../data/mockData';
import type { Expense } from '../../types/db';

export type ExpenseRecord = Expense;

const hasSupabase = Boolean(supabase);
const localStore: ExpenseRecord[] = [...mockExpenses];

const normalizeExpense = (expense: any): ExpenseRecord => ({
  id: expense.id,
  description: expense.description,
  amount: Number(expense.amount ?? 0),
  spent_at: expense.spent_at ?? expense.date ?? new Date().toISOString().slice(0, 10),
  created_at: expense.created_at ?? new Date().toISOString()
});

export const fetchAllExpenses = async (): Promise<ExpenseRecord[]> => {
  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, description, amount, spent_at, created_at')
        .order('spent_at', { ascending: false });

      if (error) {
        console.error('failed to fetch expenses', error);
      } else if (Array.isArray(data)) {
        return data.map(normalizeExpense);
      }
    } catch (error) {
      console.error('failed to fetch expenses', error);
    }
  }

  return [...localStore];
};

export const createExpense = async (input: { description: string; amount: number; spent_at: string }): Promise<ExpenseRecord> => {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('expenses')
      .insert({ description: input.description, amount: input.amount, spent_at: input.spent_at })
      .select('id, description, amount, spent_at, created_at')
      .single();

    if (error) {
      console.error('failed to create expense', error);
      throw error;
    }

    return normalizeExpense(data);
  }

  const expense: ExpenseRecord = {
    id: `exp-${Date.now()}`,
    description: input.description,
    amount: input.amount,
    spent_at: input.spent_at,
    created_at: new Date().toISOString()
  };
  localStore.unshift(expense);
  return expense;
};

export const updateExpense = async (
  id: string,
  input: { description: string; amount: number; spent_at: string }
): Promise<ExpenseRecord> => {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('expenses')
      .update({ description: input.description, amount: input.amount, spent_at: input.spent_at })
      .eq('id', id)
      .select('id, description, amount, spent_at, created_at')
      .single();

    if (error) {
      console.error('failed to update expense', error);
      throw error;
    }

    return normalizeExpense(data);
  }

  const index = localStore.findIndex((expense) => expense.id === id);
  if (index === -1) {
    throw new Error('expense not found');
  }

  const updated: ExpenseRecord = { ...localStore[index], ...input };
  localStore[index] = updated;
  return updated;
};

export const deleteExpense = async (id: string): Promise<void> => {
  if (hasSupabase && supabase) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      console.error('failed to delete expense', error);
      throw error;
    }
    return;
  }

  const index = localStore.findIndex((expense) => expense.id === id);
  if (index !== -1) {
    localStore.splice(index, 1);
  }
};
