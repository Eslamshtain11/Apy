import { supabase, getUserId } from '../../lib/supabase';
import type { Group, Payment, Student } from '../../types/db';

export type GroupBalance = {
  due_total: number;
  paid_total: number;
  remaining: number;
};

export type PaymentEntity = Payment & { status?: 'paid' | 'pending' | 'late' };

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
  [...items].sort((a, b) => getter(a).localeCompare(getter(b), 'ar'));

export const fetchStudentsByName = async (query: string, userId?: string): Promise<Student[]> => {
  const ownerId = userId ?? (await getUserId());
  const normalized = query.trim();

  let request = supabase
    .from('students')
    .select('id, full_name, phone, group_id, active, created_at')
    .eq('user_id', ownerId)
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

export const fetchGroupsByName = async (query: string, userId?: string): Promise<Group[]> => {
  const ownerId = userId ?? (await getUserId());
  const normalized = query.trim();

  let request = supabase
    .from('groups')
    .select('id, name, description, due_total, created_at')
    .eq('user_id', ownerId)
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

export const fetchAllStudents = async (userId?: string): Promise<Student[]> => fetchStudentsByName('', userId);
export const fetchAllGroups = async (userId?: string): Promise<Group[]> => fetchGroupsByName('', userId);

export const fetchAllPayments = async (userId?: string): Promise<PaymentEntity[]> => {
  const ownerId = userId ?? (await getUserId());
  const { data, error } = await supabase
    .from('payments')
    .select('id, student_id, group_id, amount, method, paid_at, note')
    .eq('user_id', ownerId)
    .order('paid_at', { ascending: false });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map(normalizePayment);
};

export const getGroupBalance = async (groupId: string, userId?: string): Promise<GroupBalance> => {
  const ownerId = userId ?? (await getUserId());
  const [{ data: groupData, error: groupError }, { data: totalsData, error: totalsError }] = await Promise.all([
    supabase
      .from('groups')
      .select('due_total')
      .eq('user_id', ownerId)
      .eq('id', groupId)
      .maybeSingle(),
    supabase
      .from('group_paid_totals')
      .select('paid_total')
      .eq('user_id', ownerId)
      .eq('group_id', groupId)
      .maybeSingle()
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

export const createStudentIfNotExists = async (name: string, phone?: string, userId?: string): Promise<Student> => {
  const ownerId = userId ?? (await getUserId());
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('اسم الطالب مطلوب.');
  }

  const { data: existing, error: fetchError } = await supabase
    .from('students')
    .select('id, full_name, phone, group_id, active, created_at')
    .eq('user_id', ownerId)
    .eq('full_name', trimmed)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existing) {
    return normalizeStudent(existing);
  }

  const { data, error } = await supabase
    .from('students')
    .insert({ full_name: trimmed, phone: phone ?? null, active: true, user_id: ownerId })
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
  },
  userId?: string
): Promise<Payment> => {
  const ownerId = userId ?? (await getUserId());
  const { data, error } = await supabase
    .from('payments')
    .insert({
      student_id: input.student_id ?? null,
      group_id: input.group_id ?? null,
      amount: input.amount,
      method: input.method,
      paid_at: input.paid_at,
      note: input.note ?? null,
      user_id: ownerId
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
  },
  userId?: string
): Promise<Payment> => {
  const ownerId = userId ?? (await getUserId());
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
    .eq('user_id', ownerId)
    .eq('id', id)
    .select('id, student_id, group_id, amount, method, paid_at, note')
    .single();

  if (error) {
    throw error;
  }

  return normalizePayment(data);
};

export const deletePayment = async (id: string, userId?: string): Promise<void> => {
  const ownerId = userId ?? (await getUserId());
  const { error } = await supabase.from('payments').delete().eq('user_id', ownerId).eq('id', id);

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
}, userId?: string): Promise<Student> => {
  const ownerId = userId ?? (await getUserId());
  const trimmedName = full_name.trim();

  if (!trimmedName) {
    throw new Error('اسم الطالب مطلوب.');
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      full_name: trimmedName,
      phone: phone ?? null,
      group_id: group_id ?? null,
      active: true,
      user_id: ownerId
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
  }>,
  userId?: string
): Promise<Student> => {
  const ownerId = userId ?? (await getUserId());
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

  const query = supabase
    .from('students')
    .update(payload)
    .eq('user_id', ownerId)
    .eq('id', id)
    .select('id, full_name, phone, group_id, active, created_at')
    .single();

  const { data, error } = Object.keys(payload).length
    ? await query
    : await supabase
        .from('students')
        .select('id, full_name, phone, group_id, active, created_at')
        .eq('user_id', ownerId)
        .eq('id', id)
        .single();

  if (error) {
    throw error;
  }

  return normalizeStudent(data);
};

export const deleteStudent = async (id: string, userId?: string): Promise<void> => {
  const ownerId = userId ?? (await getUserId());
  const { error } = await supabase.from('students').delete().eq('user_id', ownerId).eq('id', id);

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
}, userId?: string): Promise<Group> => {
  const ownerId = userId ?? (await getUserId());
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error('اسم المجموعة مطلوب.');
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({
      name: trimmedName,
      description: description ?? null,
      due_total: Number(due_total ?? 0),
      user_id: ownerId
    })
    .select('id, name, description, due_total, created_at')
    .single();

  if (error) {
    throw error;
  }

  return normalizeGroup(data);
};

export const deleteGroupRecord = async (id: string, userId?: string): Promise<void> => {
  const ownerId = userId ?? (await getUserId());
  const { error } = await supabase.from('groups').delete().eq('user_id', ownerId).eq('id', id);

  if (error) {
    throw error;
  }
};

export const assignStudentsToGroup = async (groupId: string, studentIds: string[], userId?: string): Promise<void> => {
  const ownerId = userId ?? (await getUserId());

  const { error: clearError } = await supabase
    .from('students')
    .update({ group_id: null })
    .eq('user_id', ownerId)
    .eq('group_id', groupId);
  if (clearError) {
    throw clearError;
  }

  if (!studentIds.length) {
    return;
  }

  const { error: assignError } = await supabase
    .from('students')
    .update({ group_id: groupId })
    .eq('user_id', ownerId)
    .in('id', studentIds);

  if (assignError) {
    throw assignError;
  }
};

