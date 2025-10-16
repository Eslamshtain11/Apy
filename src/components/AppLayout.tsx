import { LogOut, Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

type AppLayoutProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onCloseSidebar: () => void;
  onLogout: () => void;
};

const AppLayout = ({ isSidebarOpen, onToggleSidebar, onCloseSidebar, onLogout }: AppLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-brand-blue text-brand-light">
      <Sidebar isOpen={isSidebarOpen} onClose={onCloseSidebar} onLogout={onLogout} />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-brand-blue/80 backdrop-blur-lg">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-brand-navy/60 text-brand-light transition hover:border-brand-gold hover:text-brand-gold md:hidden"
                onClick={onToggleSidebar}
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <p className="text-xs text-brand-secondary">أهلاً بعودتك</p>
                <p className="text-xl font-bold">لوحة التحكم الرئيسية</p>
              </div>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <button
                onClick={onLogout}
                className="flex items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 bg-brand-blue/60 px-4 py-6 md:px-8 md:py-10">
          <div className="mx-auto max-w-7xl space-y-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
