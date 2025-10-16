import { useEffect, useRef, useState } from 'react';
import { LogOut, Menu, UserRound } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

type AppLayoutProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onCloseSidebar: () => void;
  onLogout: () => void;
  userName: string;
  userPhone: string;
};

const AppLayout = ({
  isSidebarOpen,
  onToggleSidebar,
  onCloseSidebar,
  onLogout,
  userName,
  userPhone
}: AppLayoutProps) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const displayName = userName?.trim() || 'بدون اسم';
  const displayPhone = userPhone?.trim() || '—';

  return (
    <div className="flex min-h-screen bg-brand-blue text-brand-light">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={onCloseSidebar}
        onLogout={onLogout}
        userName={displayName}
        userPhone={displayPhone}
      />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-brand-blue/80 backdrop-blur-lg">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-brand-navy/60 text-brand-light transition hover:border-brand-gold hover:text-brand-gold md:hidden"
                onClick={onToggleSidebar}
                aria-label="فتح القائمة"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <p className="text-xs text-brand-secondary sm:text-sm">أهلاً بعودتك</p>
                <p className="text-lg font-bold sm:text-xl">لوحة التحكم الرئيسية</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative md:hidden" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-brand-navy/60 text-brand-light transition hover:border-brand-gold hover:text-brand-gold"
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  aria-label="قائمة المستخدم"
                >
                  <UserRound className="h-5 w-5" />
                </button>
                {isUserMenuOpen && (
                  <div className="absolute left-1/2 top-full mt-3 w-48 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900/95 p-3 text-right text-sm shadow-xl">
                    <p className="text-xs text-brand-secondary">{displayName}</p>
                    <p className="text-[11px] text-brand-secondary/80">{displayPhone}</p>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="mt-3 w-full rounded-lg bg-red-500 px-3 py-2 text-white transition hover:bg-red-600"
                    >
                      تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
              <div className="hidden items-center gap-3 md:flex">
                <div className="text-right text-xs text-brand-secondary">
                  <p className="font-semibold text-brand-light">{displayName}</p>
                  <p className="mt-1 text-[11px] text-brand-secondary/80">{displayPhone}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 bg-brand-blue/60 px-4 pb-10 pt-6 sm:px-8 sm:pb-14 sm:pt-10">
          <div className="mx-auto max-w-7xl space-y-8 pb-[env(safe-area-inset-bottom)]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
