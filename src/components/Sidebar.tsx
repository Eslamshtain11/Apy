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
  <div className="flex h-full flex-col bg-brand-navy/95 shadow-xl">
    <div className="flex items-center justify-between border-b border-white/5 px-6 py-6">
      <div>
        <p className="text-sm text-brand-secondary">المحاسب الشخصي</p>
        <p className="text-2xl font-black text-brand-gold">Personal Accountant</p>
      </div>
    </div>
    <nav className="flex-1 space-y-1 px-4 py-6">
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                isActive
                  ? 'bg-brand-gold text-brand-blue shadow-soft'
                  : 'text-brand-secondary hover:bg-white/5 hover:text-brand-light'
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-brand-blue/60',
                    isActive ? 'border-brand-blue bg-brand-blue text-brand-gold' : 'text-brand-secondary'
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
    <div className="border-t border-white/5 px-6 py-6">
      <div className="flex items-center justify-between text-sm text-brand-secondary">
        <div>
          <p className="font-semibold text-brand-light">أ. سارة الجابري</p>
          <p>0100 123 4567</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-red-400 transition hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          <span>خروج</span>
        </button>
      </div>
    </div>
  </div>
);

const Sidebar = ({ isOpen, onClose, onLogout }: SidebarProps) => {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur" onClick={onClose}>
          <div
            className="h-full w-72 max-w-xs translate-x-0 bg-brand-navy/95 shadow-2xl transition-transform"
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
