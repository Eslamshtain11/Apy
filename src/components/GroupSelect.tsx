import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Group } from '../types/db';
import { fetchGroupsByName, getGroupBalance, type GroupBalance } from '../features/payments/api';
import { egp } from '../utils/format';

interface GroupSelectProps {
  value?: Group | null;
  onChange: (group: Group | null) => void;
  onBalanceChange?: (balance: GroupBalance | null) => void;
  disabled?: boolean;
  error?: string;
}

const useDebouncedValue = (value: string, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handler);
  }, [value, delay]);

  return debounced;
};

const GroupSelect = ({ value, onChange, onBalanceChange, disabled, error }: GroupSelectProps) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<GroupBalance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounced = useDebouncedValue(query);

  useEffect(() => {
    setLoading(true);
    fetchGroupsByName(debounced)
      .then(setOptions)
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [debounced]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!value) {
      setBalance(null);
      onBalanceChange?.(null);
      return;
    }

    getGroupBalance(value.id)
      .then((result) => {
        setBalance(result);
        onBalanceChange?.(result);
      })
      .catch(() => {
        setBalance(null);
        onBalanceChange?.(null);
      });
  }, [value, onBalanceChange]);

  const hasDebt = balance ? balance.remaining > 0 : false;

  const handleSelect = (group: Group) => {
    onChange(group);
    setQuery(group.name);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setBalance(null);
    onBalanceChange?.(null);
  };

  const helperText = useMemo(() => {
    if (!balance) return null;
    return `إجمالي المطلوب: ${egp(balance.due_total)} • المدفوع: ${egp(balance.paid_total)} • المتبقي: ${egp(
      balance.remaining
    )}`;
  }, [balance]);

  return (
    <div ref={containerRef} className="space-y-2">
      <div className={`relative rounded-xl border px-4 py-3 ${error ? 'border-red-500/60' : 'border-white/10'} bg-brand-blue/40`}>
        <input
          value={value ? value.name : query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(null);
          }}
          placeholder="اختر المجموعة"
          disabled={disabled}
          className="w-full border-none bg-transparent text-sm text-brand-light placeholder:text-brand-secondary focus:outline-none"
          dir="rtl"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary transition hover:text-brand-gold"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-secondary" />
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {open && options.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-brand-navy/95 shadow-soft">
          <ul className="divide-y divide-white/5 text-sm">
            {options.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(group)}
                  className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-right transition hover:bg-brand-blue/60 ${
                    value?.id === group.id ? 'bg-brand-blue/40 text-brand-gold' : 'text-brand-light'
                  }`}
                >
                  <span className="font-semibold">{group.name}</span>
                  {group.description && <span className="text-xs text-brand-secondary">{group.description}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {helperText && (
        <div className={`rounded-xl border px-4 py-3 text-xs ${hasDebt ? 'border-red-500/40 bg-red-900/20 text-red-200' : 'border-white/10 bg-brand-blue/40 text-brand-secondary'}`}>
          {helperText}
        </div>
      )}
    </div>
  );
};

export default GroupSelect;
