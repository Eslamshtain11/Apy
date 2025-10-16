import { supabase } from '../../lib/supabase';
import type { Group, Payment, Student } from '../../types/db';
import { groups as mockGroups, payments as mockPayments, students as mockStudents } from '../../data/mockData';

export type GroupBalance = {
  due_total: number;
  paid_total: number;
  remaining: number;
};

export type PaymentEntity = Payment & { status?: 'paid' | 'pending' | 'late' };

const hasSupabase = Boolean(supabase);

const studentStore: Student[] = [...mockStudents];
const groupStore: Group[] = [...mockGroups];
const paymentStore: PaymentEntity[] = mockPayments.map(({ status, ...payment }) => ({ ...payment, status }));

const normalize = (value: string) => value.trim().toLowerCase();

const sortArabic = <T,>(items: T[], getter: (item: T) => string) =>
  [...items].sort((a, b) => getter(a).localeCompare(getter(b), 'ar')); // ensures stable RTL sorting

const fallbackStudents = (query: string) => {
  if (!query) {
    return sortArabic(studentStore, (student) => student.full_name);
  }

  const normalized = normalize(query);
  return sortArabic(
    studentStore.filter((student) => normalize(student.full_name).includes(normalized)),
    (student) => student.full_name
  );
};

const fallbackGroups = (query: string) => {
  if (!query) {
    return sortArabic(groupStore, (group) => group.name);
  }

  const normalized = normalize(query);
  return sortArabic(
    groupStore.filter((group) => normalize(group.name).includes(normalized)),
    (group) => group.name
  );
};

export const fetchStudentsByName = async (query: string): Promise<Student[]> => {
  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, phone, group_id, active, created_at')
        .ilike('full_name', `%${query}%`)
        .order('full_name')
        .limit(15);

      if (error) {
        console.error('failed to fetch students', error);
        return fallbackStudents(query);
      }

      if (Array.isArray(data) && data.length) {
        return data;
      }

      return fallbackStudents(query);
    } catch (error) {
      console.error('failed to fetch students', error);
      return fallbackStudents(query);
    }
  }

  return fallbackStudents(query);
};

export const fetchGroupsByName = async (query: string): Promise<Group[]> => {
  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, description, due_total, created_at')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(15);

      if (error) {
        console.error('failed to fetch groups', error);
        return fallbackGroups(query);
      }

      if (Array.isArray(data) && data.length) {
        return data.map((group) => ({ ...group, due_total: Number(group.due_total ?? 0) }));
      }

      return fallbackGroups(query);
    } catch (error) {
      console.error('failed to fetch groups', error);
      return fallbackGroups(query);
    }
  }

  return fallbackGroups(query);
};

export const fetchAllStudents = async (): Promise<Student[]> => fetchStudentsByName('');
export const fetchAllGroups = async (): Promise<Group[]> => fetchGroupsByName('');

export const fetchAllPayments = async (): Promise<PaymentEntity[]> => {
  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id, student_id, group_id, amount, method, paid_at, note')
        .order('paid_at', { ascending: false });

      if (error) {
        console.error('failed to fetch payments', error);
        return [...paymentStore];
      }

      if (!data) {
        return [...paymentStore];
      }

      return data.map((payment) => ({ ...payment, status: 'paid' as const }));
    } catch (error) {
      console.error('failed to fetch payments', error);
      return [...paymentStore];
    }
  }

  return [...paymentStore];
};

const computeGroupBalance = (groupId: string): GroupBalance => {
  const group = groupStore.find((item) => item.id === groupId);
  const due = Number(group?.due_total ?? 0);
  const paid = paymentStore
    .filter((payment) => payment.group_id === groupId)
    .reduce((total, payment) => total + Number(payment.amount ?? 0), 0);

  const remaining = Math.max(0, due - paid);
  return { due_total: due, paid_total: paid, remaining };
};

export const getGroupBalance = async (groupId: string): Promise<GroupBalance> => {
  if (hasSupabase && supabase) {
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('due_total')
        .eq('id', groupId)
        .maybeSingle();

      if (groupError) {
        console.error('failed to fetch group info', groupError);
        return computeGroupBalance(groupId);
      }

      const { data: totalsData, error: totalsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('group_id', groupId);

      if (totalsError) {
        console.error('failed to fetch group payments', totalsError);
        return computeGroupBalance(groupId);
      }

      const due = Number(groupData?.due_total ?? 0);
      const paid = (totalsData ?? []).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
      const remaining = Math.max(0, due - paid);
      return { due_total: due, paid_total: paid, remaining };
    } catch (error) {
      console.error('failed to compute group balance', error);
      return computeGroupBalance(groupId);
    }
  }

  return computeGroupBalance(groupId);
};

export const createStudentIfNotExists = async (name: string, phone?: string): Promise<Student> => {
  const normalizedName = normalize(name);

  if (hasSupabase && supabase) {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('students')
        .select('id, full_name, phone, group_id, active, created_at')
        .ilike('full_name', `%${name}%`)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('failed to look up student', fetchError);
        throw fetchError;
      }

      if (existing) {
        return existing as Student;
      }

      const { data, error } = await supabase
        .from('students')
        .insert({ full_name: name, phone: phone ?? null, active: true })
        .select('id, full_name, phone, group_id, active, created_at')
        .single();

      if (error) {
        console.error('failed to create student', error);
        throw error;
      }

      return data as Student;
    } catch (error) {
      console.error('failed to create student, using fallback', error);
      // continue with fallback store so the UI keeps working offline
    }
  }

  const found = studentStore.find((student) => normalize(student.full_name) === normalizedName);
  if (found) {
    return found;
  }

  const newStudent: Student = {
    id: `stu-${Date.now()}`,
    full_name: name,
    phone: phone ?? null,
    group_id: null,
    active: true,
    created_at: new Date().toISOString().slice(0, 10)
  };

  studentStore.push(newStudent);
  return newStudent;
};

export const createPayment = async (
  input: {
    student_id?: string | null;
    group_id?: string | null;
    amount: number;
    method: Payment['method'];
    paid_at: string;
    note?: string | null;
  }
): Promise<Payment> => {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        student_id: input.student_id ?? null,
        group_id: input.group_id ?? null,
        amount: input.amount,
        method: input.method,
        paid_at: input.paid_at,
        note: input.note ?? null
      })
      .select('id, student_id, group_id, amount, method, paid_at, note')
      .single();

    if (error) {
      console.error('failed to create payment', error);
      throw error;
    }

    return data as Payment;
  }

  const payment: PaymentEntity = {
    id: `pay-${Date.now()}`,
    student_id: input.student_id ?? null,
    group_id: input.group_id ?? null,
    amount: input.amount,
    method: input.method,
    paid_at: input.paid_at,
    note: input.note ?? null,
    status: 'paid'
  };

  paymentStore.push(payment);
  return payment;
};

export const updatePayment = async (
  id: string,
  input: {
    student_id?: string | null;
    group_id?: string | null;
    amount: number;
    method: Payment['method'];
    paid_at: string;
    note?: string | null;
  }
): Promise<Payment> => {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('payments')
      .update({
        student_id: input.student_id ?? null,
        group_id: input.group_id ?? null,
        amount: input.amount,
        method: input.method,
        paid_at: input.paid_at,
        note: input.note ?? null
      })
      .eq('id', id)
      .select('id, student_id, group_id, amount, method, paid_at, note')
      .single();

    if (error) {
      console.error('failed to update payment', error);
      throw error;
    }

    return data as Payment;
  }

  const index = paymentStore.findIndex((payment) => payment.id === id);
  if (index === -1) {
    throw new Error('payment not found');
  }

  const updated: PaymentEntity = {
    ...paymentStore[index],
    ...input,
    student_id: input.student_id ?? null,
    group_id: input.group_id ?? null,
    status: paymentStore[index].status ?? 'paid'
  };

  paymentStore[index] = updated;
  return updated;
};

export const deletePayment = async (id: string): Promise<void> => {
  if (hasSupabase && supabase) {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) {
      console.error('failed to delete payment', error);
      throw error;
    }
    return;
  }

  const index = paymentStore.findIndex((payment) => payment.id === id);
  if (index !== -1) {
    paymentStore.splice(index, 1);
  }
};

export const listStudentsStore = (): Student[] => studentStore;
export const listGroupsStore = (): Group[] => groupStore;
export const listPaymentsStore = (): PaymentEntity[] => paymentStore;
