import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Student } from '../types/db';
import { fetchStudentsByName } from '../features/payments/api';

const useDebouncedValue = (value: string, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handler);
  }, [value, delay]);

  return debounced;
};

export interface StudentOption {
  id: string | null;
  full_name: string;
  phone?: string | null;
}

interface StudentAutocompleteProps {
  value: string;
  studentId?: string | null;
  onChange: (value: { id: string | null; name: string; phone?: string | null; student?: Student }) => void;
  onCreateStudent?: (name: string) => Promise<Student>;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

const StudentAutocomplete = ({
  value,
  studentId,
  onChange,
  onCreateStudent,
  placeholder = 'اسم الطالب',
  disabled,
  error
}: StudentAutocompleteProps) => {
  const [options, setOptions] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedValue = useDebouncedValue(value);
  const hasValue = value.trim().length > 0;

  useEffect(() => {
    if (!hasValue) {
      fetchStudentsByName('')
        .then(setOptions)
        .catch(() => setOptions([]));
      return;
    }

    setLoading(true);
    fetchStudentsByName(debouncedValue)
      .then(setOptions)
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [debouncedValue, hasValue]);

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

  const selectedStudent = useMemo(() => {
    if (!studentId) return undefined;
    return options.find((student) => student.id === studentId);
  }, [options, studentId]);

  const handleSelect = (student: Student) => {
    onChange({ id: student.id, name: student.full_name, phone: student.phone ?? undefined, student });
    setOpen(false);
  };

  const handleClear = () => {
    onChange({ id: null, name: '' });
  };

  const showCreateButton = hasValue && !studentId && !loading;

  return (
    <div ref={containerRef} className="space-y-2">
      <div className={`relative rounded-xl border px-4 py-3 ${error ? 'border-red-500/60' : 'border-white/10'} bg-brand-blue/40`}>
        <input
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => onChange({ id: null, name: event.target.value })}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full border-none bg-transparent text-sm text-brand-light placeholder:text-brand-secondary focus:outline-none"
          dir="rtl"
        />
        {studentId && (
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
            {options.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(student)}
                  className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-right transition hover:bg-brand-blue/60 ${
                    student.id === studentId ? 'bg-brand-blue/40 text-brand-gold' : 'text-brand-light'
                  }`}
                >
                  <span className="font-semibold">{student.full_name}</span>
                  {student.phone && <span className="text-xs text-brand-secondary">{student.phone}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {showCreateButton && onCreateStudent && (
        <button
          type="button"
          onClick={async () => {
            if (!onCreateStudent) return;
            const shouldCreate = window.confirm(`إنشاء طالب جديد باسم "${value}"؟`);
            if (!shouldCreate) return;
            try {
              const newStudent = await onCreateStudent(value.trim());
              onChange({
                id: newStudent.id,
                name: newStudent.full_name,
                phone: newStudent.phone ?? undefined,
                student: newStudent
              });
              setOpen(false);
            } catch (error_) {
              console.error(error_);
            }
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-gold transition hover:text-brand-light"
        >
          + إنشاء طالب جديد باسم "{value.trim()}"
        </button>
      )}
      {selectedStudent && (
        <p className="text-xs text-brand-secondary">
          تم اختيار: {selectedStudent.full_name}
          {selectedStudent.phone ? ` — ${selectedStudent.phone}` : ''}
        </p>
      )}
    </div>
  );
};

export default StudentAutocomplete;
