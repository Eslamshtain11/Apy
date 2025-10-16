import { supabase } from '../../lib/supabase';
import type { Group, Payment, Student } from '../../types/db';
import { groups as mockGroups, payments as mockPayments, students as mockStudents } from '../../data/mockData';

export type GroupBalance = {
  due_total: number;
  paid_total: number;
  remaining: number;
};

type PaymentEntity = Payment & { status?: 'paid' | 'pending' | 'late' };

const hasSupabase = Boolean(supabase);

const studentStore: Student[] = [...mockStudents];
const groupStore: Group[] = [...mockGroups];
const paymentStore: PaymentEntity[] = mockPayments.map(({ status, ...payment }) => ({ ...payment, status }));

const normalize = (value: string) => value.trim().toLowerCase();

export const fetchStudentsByName = async (query: string): Promise<Student[]> => {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, phone, group_id, active, created_at')
      .ilike('full_name', `%${query}%`)
      .order('full_name')
      .limit(15);

    if (error) {
      console.error('failed to fetch students', error);
      throw error;
    }

    return data ?? [];
  }

  if (!query) {
    return [...studentStore].sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
  }

  const normalized = normalize(query);
  return studentStore
    .filter((student) => normalize(student.full_name).includes(normalized))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
};

export const fetchGroupsByName = async (query: string): Promise<Group[]> => {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, description, due_total, created_at')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(15);

    if (error) {
      console.error('failed to fetch groups', error);
      throw error;
    }

    return data ?? [];
  }

  if (!query) {
    return [...groupStore].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }

  const normalized = normalize(query);
  return groupStore
    .filter((group) => normalize(group.name).includes(normalized))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
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
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('due_total')
      .eq('id', groupId)
      .maybeSingle();

    if (groupError) {
      console.error('failed to fetch group info', groupError);
      throw groupError;
    }

    const { data: totalsData, error: totalsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('group_id', groupId);

    if (totalsError) {
      console.error('failed to fetch group payments', totalsError);
      throw totalsError;
    }

    const due = Number(groupData?.due_total ?? 0);
    const paid = (totalsData ?? []).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    const remaining = Math.max(0, due - paid);
    return { due_total: due, paid_total: paid, remaining };
  }

  return computeGroupBalance(groupId);
};

export const createStudentIfNotExists = async (name: string, phone?: string): Promise<Student> => {
  const normalizedName = normalize(name);

  if (hasSupabase && supabase) {
    const { data: existing, error: fetchError } = await supabase
      .from('students')
      .select('id, full_name, phone, group_id, active, created_at')
      .ilike('full_name', name)
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

export const listStudentsStore = (): Student[] => studentStore;
export const listGroupsStore = (): Group[] => groupStore;
export const listPaymentsStore = (): PaymentEntity[] => paymentStore;
