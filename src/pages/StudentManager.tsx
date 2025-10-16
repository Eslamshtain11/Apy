import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Edit3, Loader2, PlusCircle, ShieldAlert, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { toast } from 'sonner';
import type { Group, Student } from '../types/db';
import {
  assignStudentsToGroup,
  createStudent,
  deleteStudent,
  fetchAllGroups,
  fetchAllStudents,
  updateStudent
} from '../features/payments/api';

const StudentManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGroupId, setEditGroupId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [membershipDrafts, setMembershipDrafts] = useState<Record<string, string[]>>({});
  const [membershipSaving, setMembershipSaving] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentData, groupData] = await Promise.all([fetchAllStudents(), fetchAllGroups()]);
      setStudents(studentData);
      setGroups(groupData);
      const drafts: Record<string, string[]> = {};
      groupData.forEach((group) => {
        drafts[group.id] = studentData.filter((student) => student.group_id === group.id).map((student) => student.id);
      });
      setMembershipDrafts(drafts);
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحميل بيانات الطلاب');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formName.trim()) {
      setFormError('يرجى إدخال اسم الطالب');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      await createStudent({
        full_name: formName.trim(),
        phone: formPhone.trim() ? formPhone.trim() : null,
        group_id: formGroupId || null
      });
      toast.success('تم إنشاء الطالب بنجاح');
      setFormName('');
      setFormPhone('');
      setFormGroupId('');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('تعذر إنشاء الطالب الجديد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (student: Student) => {
    setEditStudent(student);
    setEditName(student.full_name);
    setEditPhone(student.phone ?? '');
    setEditGroupId(student.group_id ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editStudent) return;
    if (!editName.trim()) {
      toast.error('اسم الطالب مطلوب');
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateStudent(editStudent.id, {
        full_name: editName.trim(),
        phone: editPhone.trim() ? editPhone.trim() : null,
        group_id: editGroupId || null
      });
      toast.success('تم تحديث بيانات الطالب');
      setEditStudent(null);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحديث بيانات الطالب');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    const confirmed = window.confirm(`هل تريد حذف الطالب "${student.full_name}"؟`);
    if (!confirmed) return;
    try {
      await deleteStudent(student.id);
      toast.success('تم حذف الطالب');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('تعذر حذف الطالب');
    }
  };

  const handleMembershipDraftChange = (groupId: string, selectedOptions: HTMLCollectionOf<HTMLOptionElement>) => {
    const selectedIds = Array.from(selectedOptions).map((option) => option.value);
    setMembershipDrafts((current) => ({
      ...current,
      [groupId]: selectedIds
    }));
  };

  const handleSaveMembership = async (groupId: string) => {
    const members = membershipDrafts[groupId] ?? [];
    setMembershipSaving(groupId);
    try {
      await assignStudentsToGroup(groupId, members);
      toast.success('تم تحديث المنتسبين للمجموعة');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحديث طلاب المجموعة');
    } finally {
      setMembershipSaving(null);
    }
  };

  const totalActiveStudents = useMemo(() => students.filter((student) => student.active).length, [students]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="إدارة الطلاب"
        description="قم بإضافة الطلاب، تحديث بياناتهم، وربطهم بالمجموعات الدراسية"
      />

      <section className="grid gap-6 md:grid-cols-2">
        <form
          onSubmit={handleCreateStudent}
          className="rounded-2xl border border-white/5 bg-brand-navy/60 p-6 shadow-soft"
        >
          <h2 className="text-xl font-bold text-brand-light">إضافة طالب جديد</h2>
          <p className="mt-2 text-sm text-brand-secondary">قم بتعبئة بيانات الطالب وربطه بمجموعة اختيارية.</p>
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <label className="mb-2 block text-brand-secondary">اسم الطالب</label>
              <input
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                placeholder="مثال: أحمد سمير"
                className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-brand-light focus:border-brand-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-brand-secondary">رقم الهاتف</label>
              <input
                value={formPhone}
                onChange={(event) => setFormPhone(event.target.value)}
                placeholder="0100 000 0000"
                className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-brand-light focus:border-brand-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-brand-secondary">المجموعة</label>
              <select
                value={formGroupId}
                onChange={(event) => setFormGroupId(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-brand-light focus:border-brand-gold focus:outline-none"
              >
                <option value="">بدون مجموعة</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            {formError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-900/30 px-4 py-3 text-sm text-red-200">
                <ShieldAlert className="h-4 w-4" />
                <span>{formError}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gold px-4 py-3 text-sm font-semibold text-brand-blue transition hover:bg-brand-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              {isSubmitting ? 'جاري الحفظ' : 'إضافة الطالب'}
            </button>
          </div>
        </form>
        <div className="rounded-2xl border border-white/5 bg-brand-navy/60 p-6 shadow-soft">
          <h2 className="text-xl font-bold text-brand-light">المجموعات والمنتسبون</h2>
          <p className="mt-2 text-sm text-brand-secondary">
            اختر الطلاب المنتسبين لكل مجموعة ثم اضغط على حفظ التغييرات.
          </p>
          <div className="mt-6 space-y-6">
            {loading ? (
              <div className="flex items-center gap-3 text-sm text-brand-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جارٍ تحميل المجموعات...</span>
              </div>
            ) : groups.length ? (
              groups.map((group) => (
                <div key={group.id} className="rounded-xl border border-white/10 bg-brand-blue/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-brand-light">{group.name}</p>
                      <p className="text-xs text-brand-secondary">المطلوب: {group.due_total.toLocaleString('ar-EG')} جم</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSaveMembership(group.id)}
                      disabled={membershipSaving === group.id}
                      className="rounded-lg border border-brand-gold px-3 py-2 text-xs font-semibold text-brand-gold transition hover:bg-brand-gold/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {membershipSaving === group.id ? 'جارٍ الحفظ' : 'حفظ التغييرات'}
                    </button>
                  </div>
                  <select
                    multiple
                    value={membershipDrafts[group.id] ?? []}
                    onChange={(event) =>
                      handleMembershipDraftChange(group.id, event.target.selectedOptions)
                    }
                    className="mt-4 h-32 w-full rounded-xl border border-white/10 bg-brand-navy/60 px-3 py-2 text-sm text-brand-light focus:border-brand-gold focus:outline-none"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id} className="bg-brand-navy text-brand-light">
                        {student.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            ) : (
              <EmptyState title="لا توجد مجموعات" description="أضف مجموعة من شاشة إدارة المجموعات." />
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-brand-navy/60 p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-light">الطلاب المسجلون</h2>
            <p className="mt-1 text-sm text-brand-secondary">تحكم في بيانات الطلاب الحالية وتابع أرقامهم.</p>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-brand-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جارٍ تحميل الطلاب...</span>
            </div>
          ) : students.length ? (
            <table className="min-w-full text-right text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-brand-secondary">
                  <th className="px-4 py-3">الطالب</th>
                  <th className="px-4 py-3">الهاتف</th>
                  <th className="px-4 py-3">المجموعة</th>
                  <th className="px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const groupName = groups.find((group) => group.id === student.group_id)?.name ?? 'بدون مجموعة';
                  return (
                    <tr key={student.id} className="border-b border-white/5">
                      <td className="px-4 py-4 text-brand-light">{student.full_name}</td>
                      <td className="px-4 py-4 text-brand-secondary">{student.phone ?? '—'}</td>
                      <td className="px-4 py-4 text-brand-secondary">{groupName}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(student)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-400/40 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/10"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(student)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState title="لا يوجد طلاب" description="أضف طالبًا جديدًا لبدء المتابعة." />
          )}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <StatCard title="إجمالي الطلاب" value={`${students.length}`} />
        <StatCard title="الطلاب النشطون" value={`${totalActiveStudents}`} />
        <StatCard title="عدد المجموعات" value={`${groups.length}`} />
      </section>

      <Modal
        isOpen={Boolean(editStudent)}
        onClose={() => setEditStudent(null)}
        title="تعديل بيانات الطالب"
        description="حدث بيانات الطالب مع إمكانية تغيير المجموعة المرتبطة"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditStudent(null)}
              className="rounded-xl border border-white/10 px-5 py-2 text-sm font-semibold text-brand-secondary transition hover:text-brand-light"
              disabled={isSavingEdit}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="rounded-xl bg-brand-gold px-5 py-2 text-sm font-semibold text-brand-blue transition hover:bg-brand-gold/90 disabled:opacity-60"
              disabled={isSavingEdit}
            >
              {isSavingEdit ? 'جارٍ الحفظ' : 'حفظ التغييرات'}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-brand-secondary">اسم الطالب</label>
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-brand-blue/40 px-4 py-3 text-brand-light focus:border-brand-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-brand-secondary">رقم الهاتف</label>
            <input
              value={editPhone}
              onChange={(event) => setEditPhone(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-brand-blue/40 px-4 py-3 text-brand-light focus:border-brand-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-brand-secondary">المجموعة</label>
            <select
              value={editGroupId}
              onChange={(event) => setEditGroupId(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-brand-blue/40 px-4 py-3 text-brand-light focus:border-brand-gold focus:outline-none"
            >
              <option value="">بدون مجموعة</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentManager;
