import { supabase } from '../../lib/supabase';
import type { Group, Payment, Student } from '../../types/db';

export type GroupBalance = {
  due_total: number;
  paid_total: number;
  remaining: number;
};

export type PaymentEntity = Payment & { status?: 'paid' | 'pending' | 'late' };

const ensureClient = () => {
  if (!supabase) {
    throw new Error('لم يتم تهيئة عميل Supabase.');
  }
  return supabase;
};

const normalizeStudent = (student: any): Student => ({
  id: student.id,
  full_name: student.full_name,
  phone: student.phone ?? null,
  group_id: student.group_id ?? null,
  active: Boolean(student.active),
  created_at: student.created_at ?? new Date().toISOString()
});

const normalizeGroup = (group: any): Group => ({
  id: group.id,
  name: group.name,
  description: group.description ?? null,
  due_total: Number(group.due_total ?? 0),
  created_at: group.created_at ?? new Date().toISOString()
});

const normalizePayment = (payment: any): PaymentEntity => ({
  id: payment.id,
  student_id: payment.student_id ?? null,
  group_id: payment.group_id ?? null,
  amount: Number(payment.amount ?? 0),
  method: payment.method,
  paid_at: payment.paid_at,
  note: payment.note ?? null,
  status: 'paid'
});

const sortArabic = <T,>(items: T[], getter: (item: T) => string) =>
  [...items].sort((a, b) => getter(a).localeCompare(getter(b), 'ar')); // ensures stable RTL sorting

export const fetchStudentsByName = async (query: string): Promise<Student[]> => {
  const client = ensureClient();
  const normalized = query.trim();

  let request = client
    .from('students')
    .select('id, full_name, phone, group_id, active, created_at')
    .order('full_name', { ascending: true })
    .limit(50);

  if (normalized) {
    request = request.ilike('full_name', `%${normalized}%`);
  }

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return sortArabic(data.map(normalizeStudent), (student) => student.full_name);
};

export const fetchGroupsByName = async (query: string): Promise<Group[]> => {
  const client = ensureClient();
  const normalized = query.trim();

  let request = client
    .from('groups')
    .select('id, name, description, due_total, created_at')
    .order('name', { ascending: true })
    .limit(50);

  if (normalized) {
    request = request.ilike('name', `%${normalized}%`);
  }

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return sortArabic(data.map(normalizeGroup), (group) => group.name);
};

export const fetchAllStudents = async (): Promise<Student[]> => fetchStudentsByName('');
export const fetchAllGroups = async (): Promise<Group[]> => fetchGroupsByName('');

export const fetchAllPayments = async (): Promise<PaymentEntity[]> => {
  const client = ensureClient();
  const { data, error } = await client
    .from('payments')
    .select('id, student_id, group_id, amount, method, paid_at, note')
    .order('paid_at', { ascending: false });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map(normalizePayment);
};

export const getGroupBalance = async (groupId: string): Promise<GroupBalance> => {
  const client = ensureClient();
  const [{ data: groupData, error: groupError }, { data: totalsData, error: totalsError }] = await Promise.all([
    client.from('groups').select('due_total').eq('id', groupId).maybeSingle(),
    client.from('group_paid_totals').select('paid_total').eq('group_id', groupId).maybeSingle()
  ]);

  if (groupError) {
    throw groupError;
  }
  if (totalsError) {
    throw totalsError;
  }

  const due = Number(groupData?.due_total ?? 0);
  const paid = Number(totalsData?.paid_total ?? 0);
  const remaining = Math.max(0, due - paid);

  return { due_total: due, paid_total: paid, remaining };
};

export const createStudentIfNotExists = async (name: string, phone?: string): Promise<Student> => {
  const client = ensureClient();
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('اسم الطالب مطلوب.');
  }

  const { data: existing, error: fetchError } = await client
    .from('students')
    .select('id, full_name, phone, group_id, active, created_at')
    .eq('full_name', trimmed)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existing) {
    return normalizeStudent(existing);
  }

  const { data, error } = await client
    .from('students')
    .insert({ full_name: trimmed, phone: phone ?? null, active: true })
    .select('id, full_name, phone, group_id, active, created_at')
    .single();

  if (error) {
    throw error;
  }

  return normalizeStudent(data);
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
  const client = ensureClient();
  const { data, error } = await client
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
    throw error;
  }

  return normalizePayment(data);
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
  const client = ensureClient();
  const { data, error } = await client
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
    throw error;
  }

  return normalizePayment(data);
};

export const deletePayment = async (id: string): Promise<void> => {
  const client = ensureClient();
  const { error } = await client.from('payments').delete().eq('id', id);

  if (error) {
    throw error;
  }
};

export const createStudent = async ({
  full_name,
  phone,
  group_id
}: {
  full_name: string;
  phone?: string | null;
  group_id?: string | null;
}): Promise<Student> => {
  const client = ensureClient();
  const trimmedName = full_name.trim();

  if (!trimmedName) {
    throw new Error('اسم الطالب مطلوب.');
  }

  const { data, error } = await client
    .from('students')
    .insert({
      full_name: trimmedName,
      phone: phone ?? null,
      group_id: group_id ?? null,
      active: true
    })
    .select('id, full_name, phone, group_id, active, created_at')
    .single();

  if (error) {
    throw error;
  }

  return normalizeStudent(data);
};

export const updateStudent = async (
  id: string,
  input: Partial<{
    full_name: string;
    phone: string | null;
    group_id: string | null;
    active: boolean;
  }>
): Promise<Student> => {
  const client = ensureClient();
  const payload: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(input, 'full_name')) {
    payload.full_name = input.full_name?.trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'phone')) {
    payload.phone = input.phone ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'group_id')) {
    payload.group_id = input.group_id ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'active')) {
    payload.active = input.active;
  }

  const query = client
    .from('students')
    .update(payload)
    .eq('id', id)
    .select('id, full_name, phone, group_id, active, created_at')
    .single();

  const { data, error } = Object.keys(payload).length ? await query : await client
    .from('students')
    .select('id, full_name, phone, group_id, active, created_at')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return normalizeStudent(data);
};

export const deleteStudent = async (id: string): Promise<void> => {
  const client = ensureClient();
  const { error } = await client.from('students').delete().eq('id', id);

  if (error) {
    throw error;
  }
};

export const createGroupRecord = async ({
  name,
  description,
  due_total
}: {
  name: string;
  description?: string | null;
  due_total?: number;
}): Promise<Group> => {
  const client = ensureClient();
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error('اسم المجموعة مطلوب.');
  }

  const { data, error } = await client
    .from('groups')
    .insert({
      name: trimmedName,
      description: description ?? null,
      due_total: Number(due_total ?? 0)
    })
    .select('id, name, description, due_total, created_at')
    .single();

  if (error) {
    throw error;
  }

  return normalizeGroup(data);
};

export const deleteGroupRecord = async (id: string): Promise<void> => {
  const client = ensureClient();
  const { error } = await client.from('groups').delete().eq('id', id);

  if (error) {
    throw error;
  }
};

export const assignStudentsToGroup = async (groupId: string, studentIds: string[]): Promise<void> => {
  const client = ensureClient();

  const { error: clearError } = await client.from('students').update({ group_id: null }).eq('group_id', groupId);
  if (clearError) {
    throw clearError;
  }

  if (!studentIds.length) {
    return;
  }

  const { error: assignError } = await client
    .from('students')
    .update({ group_id: groupId })
    .in('id', studentIds);

  if (assignError) {
    throw assignError;
  }
};
