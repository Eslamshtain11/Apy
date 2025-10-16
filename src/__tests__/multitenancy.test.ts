import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('../lib/supabase', () => {
  type Row = Record<string, any>;

  const tableData: Record<string, Row[]> = {
    students: [
      {
        id: 'student-1',
        user_id: 'user-a',
        full_name: 'أحمد علي',
        phone: null,
        group_id: null,
        active: true,
        created_at: '2024-01-01T00:00:00.000Z'
      }
    ]
  };
  const eqCalls: Record<string, { column: string; value: unknown }[]> = {};
  const insertPayloads: Record<string, any[]> = {};

  class MockBuilder {
    constructor(private table: string) {}

    private get data(): Row[] {
      return tableData[this.table] ?? [];
    }

    select() {
      return this;
    }

    order() {
      return this;
    }

    limit() {
      return this;
    }

    ilike(column: string, value: string) {
      const normalized = value.replace(/%/g, '').toLowerCase();
      tableData[this.table] = this.data.filter((row) =>
        String(row[column] ?? '')
          .toLowerCase()
          .includes(normalized)
      );
      return this;
    }

    eq(column: string, value: unknown) {
      (eqCalls[this.table] ||= []).push({ column, value });
      tableData[this.table] = this.data.filter((row) => {
        if (!(column in row)) return true;
        return row[column] === value;
      });
      return this;
    }

    in(_column: string, _values: unknown[]) {
      return this;
    }

    insert(payload: any) {
      const items = Array.isArray(payload) ? payload : [payload];
      (insertPayloads[this.table] ||= []).push(payload);
      tableData[this.table] = items.map((item, index) => ({
        ...item,
        id: item.id ?? `mock-${index}`
      }));
      return this;
    }

    update(_payload: any) {
      return this;
    }

    delete() {
      return this;
    }

    maybeSingle() {
      return Promise.resolve({ data: this.data[0] ?? null, error: null });
    }

    single() {
      return Promise.resolve({ data: this.data[0] ?? null, error: null });
    }

    then<TResult>(resolve: (value: { data: Row[]; error: null }) => TResult) {
      return resolve({ data: this.data, error: null });
    }
  }

  const supabase = {
    from: (table: string) => new MockBuilder(table)
  } as const;

  const getUserId = vi.fn(async () => 'user-a');

  return {
    supabase,
    getUserId,
    __eqCalls: eqCalls,
    __insertPayloads: insertPayloads,
    __setTableData: (table: string, rows: Row[]) => {
      tableData[table] = rows;
    }
  };
});

const paymentsApi = await import('../features/payments/api');

const supabaseModule = await import('../lib/supabase');
const eqCalls = (supabaseModule as any).__eqCalls as Record<string, { column: string; value: unknown }[]>;
const insertPayloads = (supabaseModule as any).__insertPayloads as Record<string, any[]>;
const setTableData = (supabaseModule as any).__setTableData as (table: string, rows: any[]) => void;

describe('supabase multitenancy enforcement', () => {
  beforeEach(() => {
    eqCalls.students = [];
    insertPayloads.payments = [];
    setTableData('students', [
      {
        id: 'student-1',
        user_id: 'user-a',
        full_name: 'أحمد علي',
        phone: null,
        group_id: null,
        active: true,
        created_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'student-2',
        user_id: 'user-b',
        full_name: 'طالب آخر',
        phone: null,
        group_id: null,
        active: true,
        created_at: '2024-01-02T00:00:00.000Z'
      }
    ]);
  });

  it('filters student queries by user_id', async () => {
    const students = await paymentsApi.fetchAllStudents();

    expect(eqCalls.students?.some((call) => call.column === 'user_id' && call.value === 'user-a')).toBe(true);
    expect(students).toHaveLength(1);
    expect(students[0].id).toBe('student-1');
  });

  it('assigns user_id on payment creation', async () => {
    await paymentsApi.createPayment({
      amount: 1000,
      method: 'cash',
      paid_at: '2024-01-01',
      student_id: null,
      group_id: null
    });

    const payload = insertPayloads.payments?.[0];
    expect(payload).toBeDefined();
    expect(Array.isArray(payload)).toBe(false);
    expect(payload.user_id).toBe('user-a');
    expect(payload.amount).toBe(1000);
  });
});

