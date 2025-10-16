import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  BarChartBig,
  Search,
  GraduationCap,
  Users,
  KeySquare,
  MonitorSmartphone,
  LogOut
} from 'lucide-react';

const navigation = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/payments', label: 'كشف الحساب', icon: Receipt },
  { to: '/expenses', label: 'المصروفات', icon: Wallet },
  { to: '/analytics', label: 'الإحصاءات', icon: BarChartBig },
  { to: '/students', label: 'بحث الطالب', icon: Search },
  { to: '/student-management', label: 'إدارة الطلاب', icon: GraduationCap },
  { to: '/groups', label: 'إدارة المجموعات', icon: Users },
  { to: '/guest-codes', label: 'أكواد الضيوف', icon: KeySquare },
  { to: '/guest', label: 'واجهة الزائر', icon: MonitorSmartphone }
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
};

const SidebarContent = ({ onLogout, onNavigate }: { onLogout: () => void; onNavigate?: () => void }) => (
  <div className="flex h-full flex-col bg-slate-950/90 text-gray-100 shadow-xl backdrop-blur-lg">
    <div className="flex items-center justify-between border-b border-white/10 px-6 py-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">المحاسب الشخصي</p>
        <p className="text-lg font-bold text-brand-gold sm:text-xl">Personal Accountant</p>
      </div>
    </div>
    <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6 text-sm sm:text-base">
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl px-4 py-3 transition-all',
                isActive
                  ? 'bg-brand-gold/90 text-brand-blue shadow-lg'
                  : 'text-brand-secondary hover:bg-white/5 hover:text-gray-100'
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-brand-blue/70',
                    isActive ? 'border-brand-blue bg-brand-blue text-brand-gold' : 'text-brand-secondary'
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="truncate font-semibold">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
    <div className="border-t border-white/10 px-4 pb-[env(safe-area-inset-bottom)] pt-4 sm:px-6 sm:pt-6">
      <div className="rounded-2xl bg-slate-800/70 p-4">
        <p className="text-sm font-semibold text-gray-100">أ. سارة الجابري</p>
        <p className="mt-1 text-xs text-brand-secondary">0100 123 4567</p>
        <button
          onClick={onLogout}
          className="mt-4 w-full rounded-lg bg-red-500 px-4 py-2 text-right text-sm font-semibold text-white transition hover:bg-red-600"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  </div>
);

const Sidebar = ({ isOpen, onClose, onLogout }: SidebarProps) => {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-md" onClick={onClose}>
          <div
            className="h-full w-72 max-w-xs translate-x-0 bg-slate-950/95 shadow-2xl transition-transform"
            onClick={(event) => event.stopPropagation()}
          >
            <SidebarContent
              onLogout={() => {
                onLogout();
                onClose();
              }}
              onNavigate={onClose}
            />
          </div>
        </div>
      )}
      <div className="hidden w-72 shrink-0 md:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent onLogout={onLogout} />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
