export interface Group {
  id: string;
  name: string;
  description?: string | null;
  due_total: number;
  created_at: string;
}

export interface Student {
  id: string;
  full_name: string;
  phone?: string | null;
  group_id?: string | null;
  active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  student_id?: string | null;
  group_id?: string | null;
  amount: number;
  method: 'cash' | 'card' | 'transfer';
  paid_at: string;
  note?: string | null;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  spent_at: string;
  created_at: string;
}
