import { useState } from 'react';
import { PlusCircle, ShieldAlert, Trash } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import { groups as initialGroups, students } from '../data/mockData';

const Groups = () => {
  const [groupName, setGroupName] = useState('');
  const [groupList, setGroupList] = useState(initialGroups);
  const [error, setError] = useState('');

  const handleAddGroup = () => {
    if (!groupName.trim()) {
      setError('يرجى إدخال اسم المجموعة.');
      return;
    }
    setGroupList((items) => [
      ...items,
      {
        id: `grp-${Date.now()}`,
        name: groupName.trim(),
        description: null,
        due_total: 0,
        created_at: new Date().toISOString().slice(0, 10)
      }
    ]);
    setGroupName('');
    setError('');
  };

  const handleDeleteGroup = (id: string) => {
    if (groupList.length === 1) {
      setError('لا يمكن حذف آخر مجموعة متاحة.');
      return;
    }
    setGroupList((items) => items.filter((item) => item.id !== id));
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
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-900/30 px-4 py-3 text-sm text-red-200">
                <ShieldAlert className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={handleAddGroup}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gold px-4 py-3 text-sm font-semibold text-brand-blue transition hover:bg-brand-gold/90"
            >
              <PlusCircle className="h-4 w-4" />
              إضافة المجموعة
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-brand-navy/60 p-6 shadow-soft">
          <h2 className="text-xl font-bold text-brand-light">المجموعات الحالية</h2>
          <p className="mt-2 text-sm text-brand-secondary">
            إدارة سريعة للمجموعات المرتبطة بالطلاب الحاليين.
          </p>
          <div className="mt-6 space-y-4">
            {groupList.length ? (
              groupList.map((group) => {
                const studentCount = students.filter((student) => student.group_id === group.id).length;
                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-brand-light">{group.name}</p>
                      <p className="text-xs text-brand-secondary">{studentCount} طالب</p>
                    </div>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                    >
                      <Trash className="h-4 w-4" />
                      حذف
                    </button>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="لا توجد مجموعات"
                description="أضف مجموعة جديدة لبدء تنظيم الطلاب."
              />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <StatCard title="إجمالي المجموعات" value={`${groupList.length}`} />
        <StatCard
          title="متوسط الطلاب في المجموعة"
          value={groupList.length ? Math.round(students.length / groupList.length) : 0}
        />
        <StatCard title="إجمالي الطلاب" value={`${students.length}`} />
      </section>
    </div>
  );
};

export default Groups;
