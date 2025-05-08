import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import Rooms from './pages/Rooms';
import Payments from './pages/Payments';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Properties from './pages/Properties';
import MarketplaceSettings from './pages/MarketplaceSettings';
import Chat from './pages/Chat';
import { PropertyProvider, useProperty } from './contexts/PropertyContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { supabase } from './lib/supabase';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProperty } = useProperty();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (!session) {
        // Save the intended destination
        navigate('/login', { state: { from: location.pathname } });
      } else {
        // Check user role
        const role = session.user.user_metadata?.role;
        setUserRole(role);

        // Redirect tenant users to marketplace
        if (role === 'tenant') {
          navigate('/');
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location]);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Only redirect to properties if we're not already there and no property is selected
  // and the user is not a tenant
  if (!selectedProperty && location.pathname !== '/properties' && userRole !== 'tenant') {
    return <Navigate to="/properties" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.substring(1) || 'dashboard';
    setActivePage(path);
  }, [location]);

  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    tenants: 'Manajemen Penyewa',
    rooms: 'Manajemen Kamar',
    payments: 'Catatan Pembayaran',
    maintenance: 'Pemeliharaan',
    reports: 'Laporan Keuangan',
    notifications: 'Notifikasi',
    settings: 'Pengaturan',
    properties: 'Properti',
    'marketplace-settings': 'Pengaturan Marketplace'
  };

  const navigate = useNavigate();

  const handleNavigate = (page: string) => {
    navigate(`/${page}`);
    setActivePage(page);
  };

  return (
    <Layout 
      title={pageTitles[activePage]} 
      activeItem={activePage}
      onNavigate={handleNavigate}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard onNavigate={handleNavigate} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tenants" 
          element={
            <ProtectedRoute>
              <Tenants />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/rooms" 
          element={
            <ProtectedRoute>
              <Rooms />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payments" 
          element={
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/maintenance" 
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/properties" 
          element={
            <ProtectedRoute>
              <Properties />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/marketplace-settings" 
          element={
            <ProtectedRoute>
              <MarketplaceSettings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <Router>
      <PropertyProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </NotificationProvider>
      </PropertyProvider>
    </Router>
  );
}

export default App;