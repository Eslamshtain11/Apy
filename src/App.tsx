import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Analytics from './pages/Analytics';
import StudentSearch from './pages/StudentSearch';
import StudentManager from './pages/StudentManager';
import Groups from './pages/Groups';
import GuestCodes from './pages/GuestCodes';
import GuestView from './pages/GuestView';
import AuthPage from './pages/AuthPage';
import { AppDataProvider } from './contexts/AppDataContext';
import { supabase } from './lib/supabase';

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<{ name: string | null; phone: string | null }>({
    name: null,
    phone: null
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session ?? null);
      setInitializing(false);
    };

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session?.user?.id) {
      setProfile({ name: null, phone: null });
      return;
    }

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('name, phone')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!active) return;
      if (error && error.code !== 'PGRST116') {
        console.error(error);
        setProfile({ name: null, phone: null });
        return;
      }

      setProfile({ name: data?.name ?? null, phone: data?.phone ?? null });
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsSidebarOpen(false);
    navigate('/auth', { replace: true });
  };

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-blue text-brand-light">
        <div className="rounded-2xl border border-white/10 bg-brand-navy/60 px-8 py-6 text-brand-secondary">
          جارٍ التحقق من الجلسة...
        </div>
      </div>
    );
  }

  const isAuthenticated = Boolean(session);

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <AuthPage
              onAuthSuccess={() => {
                navigate('/', { replace: true });
              }}
              onGuestEnter={() => {
                navigate('/guest', { replace: true });
              }}
            />
          )
        }
      />
      <Route
        path="/guest"
        element={
          <AppDataProvider userId="">
            <GuestView />
          </AppDataProvider>
        }
      />
      <Route
        path="/"
        element={
          isAuthenticated && session?.user ? (
            <AppDataProvider userId={session.user.id}>
              <AppLayout
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen((state) => !state)}
                onCloseSidebar={() => setIsSidebarOpen(false)}
                onLogout={handleLogout}
                userName={profile.name ?? ''}
                userPhone={profile.phone ?? ''}
              />
            </AppDataProvider>
          ) : (
            <Navigate to="/auth" replace state={{ from: location.pathname }} />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="payments" element={<Payments />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="students" element={<StudentSearch />} />
        <Route path="student-management" element={<StudentManager />} />
        <Route path="groups" element={<Groups />} />
        <Route path="guest-codes" element={<GuestCodes />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/auth'} replace />} />
    </Routes>
  );
};

export default App;
