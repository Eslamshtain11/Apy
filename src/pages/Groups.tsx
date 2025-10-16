import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2, PlusCircle, ShieldAlert, Trash } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import type { Group, Student } from '../types/db';
import {
  assignStudentsToGroup,
  createGroupRecord,
  deleteGroupRecord,
  fetchAllGroups,
  fetchAllStudents
} from '../features/payments/api';
import { egp } from '../utils/format';
import { toast } from 'sonner';

const Groups = () => {
  const [groupName, setGroupName] = useState('');
  const [groupTarget, setGroupTarget] = useState('');
  const [groupList, setGroupList] = useState<Group[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [membershipDrafts, setMembershipDrafts] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingMembership, setSavingMembership] = useState<string | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [groups, students] = await Promise.all([fetchAllGroups(), fetchAllStudents()]);
      setGroupList(groups);
      setStudentsList(students);
      const drafts: Record<string, string[]> = {};
      groups.forEach((group) => {
        drafts[group.id] = students.filter((student) => student.group_id === group.id).map((student) => student.id);
      });
      setMembershipDrafts(drafts);
    } catch (error_) {
      console.error(error_);
      toast.error('تعذر تحميل بيانات المجموعات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const handleAddGroup = () => {
    if (!groupName.trim()) {
      setError('يرجى إدخال اسم المجموعة.');
      return;
    }
    setAddingGroup(true);
    setError('');
    const due = Number(groupTarget) || 0;
    if (due < 0) {
      setError('المبلغ المستهدف لا يمكن أن يكون سالباً.');
      setAddingGroup(false);
      return;
    }

    (async () => {
      try {
        await createGroupRecord({
          name: groupName.trim(),
          due_total: due
        });
        toast.success('تم إنشاء المجموعة بنجاح');
        setGroupName('');
        setGroupTarget('');
        await refreshData();
      } catch (error_) {
        console.error(error_);
        toast.error('تعذر إنشاء المجموعة الجديدة');
      } finally {
        setAddingGroup(false);
      }
    })();
  };

  const handleDeleteGroup = (id: string) => {
    if (groupList.length === 1) {
      setError('لا يمكن حذف آخر مجموعة متاحة.');
      return;
    }
    const group = groupList.find((item) => item.id === id);
    if (!group) return;

    const confirmed = window.confirm(`هل تريد حذف المجموعة "${group.name}"؟ سيتم فك ارتباط طلابها.`);
    if (!confirmed) return;

    setDeletingGroup(id);
    (async () => {
      try {
        await deleteGroupRecord(id);
        toast.success('تم حذف المجموعة');
        await refreshData();
      } catch (error_) {
        console.error(error_);
        toast.error('تعذر حذف المجموعة');
      } finally {
        setDeletingGroup(null);
      }
    })();
  };

  const toggleStudentSelection = (groupId: string, studentId: string) => {
    setMembershipDrafts((current) => {
      const currentMembers = new Set(current[groupId] ?? []);
      if (currentMembers.has(studentId)) {
        currentMembers.delete(studentId);
      } else {
        currentMembers.add(studentId);
      }
      return {
        ...current,
        [groupId]: Array.from(currentMembers)
      };
    });
  };

  const handleSaveMembership = async (groupId: string) => {
    const members = membershipDrafts[groupId] ?? [];
    setSavingMembership(groupId);
    try {
      await assignStudentsToGroup(groupId, members);
      toast.success('تم تحديث طلاب المجموعة');
      await refreshData();
    } catch (error_) {
      console.error(error_);
      toast.error('تعذر تحديث طلاب المجموعة');
    } finally {
      setSavingMembership(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="إدارة المجموعات"
        description="أضف مجموعات جديدة ورتب الفصول الدراسية دون القلق من حذف آخر مجموعة"
      />

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-brand-navy/60 p-6 shadow-soft">
          <h2 className="text-xl font-bold text-brand-light">إضافة مجموعة جديدة</h2>
          <p className="mt-2 text-sm text-brand-secondary">
            أضف اسم المجموعة كما يظهر للطلاب داخل فواتيرهم وتقاريرهم.
          </p>
          <div className="mt-6 space-y-4">
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="مثال: فيزياء - ثالث ثانوي"
              className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
            />
            <input
              value={groupTarget}
              onChange={(event) => setGroupTarget(event.target.value)}
              type="number"
              min="0"
              step="100"
              placeholder="إجمالي المستهدف للمجموعة (اختياري)"
              className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
            />
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-900/30 px-4 py-3 text-sm text-red-200">
                <ShieldAlert className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={handleAddGroup}
              disabled={addingGroup}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gold px-4 py-3 text-sm font-semibold text-brand-blue transition hover:bg-brand-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              {addingGroup ? 'جارٍ الإضافة' : 'إضافة المجموعة'}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-brand-navy/60 p-6 shadow-soft">
          <h2 className="text-xl font-bold text-brand-light">المجموعات الحالية</h2>
          <p className="mt-2 text-sm text-brand-secondary">
            إدارة سريعة للمجموعات المرتبطة بالطلاب الحاليين.
          </p>
          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-brand-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جارٍ تحميل المجموعات...</span>
              </div>
            ) : groupList.length ? (
              groupList.map((group) => {
                const studentCount = studentsList.filter((student) => student.group_id === group.id).length;
                return (
                  <div key={group.id} className="space-y-4 rounded-xl border border-white/10 bg-brand-blue/60 p-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-brand-light">{group.name}</p>
                        <p className="text-xs text-brand-secondary">
                          {studentCount} طالب • المستهدف {egp(group.due_total)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        disabled={deletingGroup === group.id}
                        className="flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash className="h-4 w-4" />
                        {deletingGroup === group.id ? 'جارٍ الحذف' : 'حذف'}
                      </button>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs text-brand-secondary">حدد الطلاب المنتسبين</label>
                      <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-brand-navy/40 p-2">
                        {studentsList.length ? (
                          studentsList.map((student) => {
                            const checked = (membershipDrafts[group.id] ?? []).includes(student.id);
                            return (
                              <label
                                key={student.id}
                                className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
                                  checked
                                    ? 'border-brand-gold bg-brand-gold/10 text-brand-light'
                                    : 'border-white/10 bg-brand-navy/60 text-brand-secondary hover:border-brand-gold/40'
                                }`}
                              >
                                <span>{student.full_name}</span>
                                <span className="flex items-center gap-2 text-brand-light">
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={checked}
                                    onChange={() => toggleStudentSelection(group.id, student.id)}
                                  />
                                  {checked ? (
                                    <CheckCircle2 className="h-5 w-5 text-brand-gold" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-brand-secondary" />
                                  )}
                                </span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="py-6 text-center text-xs text-brand-secondary">لا يوجد طلاب حالياً</div>
                        )}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => handleSaveMembership(group.id)}
                          disabled={savingMembership === group.id}
                          className="rounded-lg border border-brand-gold px-3 py-2 text-xs font-semibold text-brand-gold transition hover:bg-brand-gold/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingMembership === group.id ? 'جارٍ الحفظ' : 'حفظ الإعدادات'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="لا توجد مجموعات" description="أضف مجموعة جديدة لبدء تنظيم الطلاب." />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <StatCard title="إجمالي المجموعات" value={`${groupList.length}`} />
        <StatCard
          title="متوسط الطلاب في المجموعة"
          value={groupList.length ? Math.round(studentsList.length / groupList.length) : 0}
        />
        <StatCard title="إجمالي الطلاب" value={`${studentsList.length}`} />
      </section>
    </div>
  );
};

export default Groups;
