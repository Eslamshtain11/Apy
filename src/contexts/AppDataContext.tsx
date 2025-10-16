import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from 'react';
import { toast } from 'sonner';
import type { Group, Student } from '../types/db';
import type { ExpenseRecord } from '../features/expenses/api';
import {
  fetchAllGroups,
  fetchAllPayments,
  fetchAllStudents,
  type PaymentEntity
} from '../features/payments/api';
import { fetchAllExpenses } from '../features/expenses/api';

interface AppDataContextValue {
  loading: boolean;
  error: string | null;
  payments: PaymentEntity[];
  students: Student[];
  groups: Group[];
  expenses: ExpenseRecord[];
  refresh: () => Promise<boolean>;
  setPayments: Dispatch<SetStateAction<PaymentEntity[]>>;
  setStudents: Dispatch<SetStateAction<Student[]>>;
  setGroups: Dispatch<SetStateAction<Group[]>>;
  setExpenses: Dispatch<SetStateAction<ExpenseRecord[]>>;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentEntity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const [studentsData, groupsData, paymentsData, expensesData] = await Promise.all([
        fetchAllStudents(),
        fetchAllGroups(),
        fetchAllPayments(),
        fetchAllExpenses()
      ]);

      setStudents(studentsData);
      setGroups(groupsData);
      setPayments(paymentsData.map((payment) => ({ ...payment, status: payment.status ?? 'paid' })));
      setExpenses(expensesData);
      return true;
    } catch (error_) {
      console.error(error_);
      setError('تعذر تحميل البيانات من Supabase');
      toast.error('تعذر تحميل البيانات من Supabase، تحقق من الاتصال.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      loading,
      error,
      payments,
      students,
      groups,
      expenses,
      refresh: load,
      setPayments,
      setStudents,
      setGroups,
      setExpenses
    }),
    [loading, error, payments, students, groups, expenses, load]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = (): AppDataContextValue => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
