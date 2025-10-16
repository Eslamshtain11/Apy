import { useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return Boolean(localStorage.getItem('authToken'));
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsSidebarOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    navigate('/auth');
  };

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
                setIsAuthenticated(true);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('authToken', 'demo-auth-token');
                }
                navigate('/', { replace: true });
              }}
              onGuestEnter={() => {
                navigate('/guest', { replace: true });
              }}
            />
          )
        }
      />
      <Route path="/guest" element={<GuestView />} />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <AppLayout
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen((state) => !state)}
              onCloseSidebar={() => setIsSidebarOpen(false)}
              onLogout={handleLogout}
            />
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
