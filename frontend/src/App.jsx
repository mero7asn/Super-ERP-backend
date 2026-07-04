import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import LeadDistributionPage from './pages/LeadDistributionPage';
import OffersPage from './pages/OffersPage';
import BookingLookupPage from './pages/BookingLookupPage';
import TicketsPage from './pages/TicketsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SalesKanbanPage from './pages/SalesKanbanPage';
import ExecutiveDashboardPage from './pages/ExecutiveDashboardPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import CampaignsPage from './pages/CampaignsPage';
import UsersPage from './pages/UsersPage';
import UserProfilePage from './pages/UserProfilePage';
import TeamsPage from './pages/TeamsPage';
import SettingsPage from './pages/SettingsPage';
import DevToolsPage from './pages/DevToolsPage';
import CampaignFormPage from './pages/CampaignFormPage';
import { useAuth } from './context/AuthContext';

// Layout wrapper: renders Sidebar + content for authenticated pages
const AppLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};

// Inner router — needs access to AuthContext
const AppRoutes = () => {
  const { user } = useAuth();

  const analyticsRoles = [
    'Super CRM Administrator', 'Executive User',
    'Business Analyst', 'System Architect'
  ];

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected: Dashboard — all authenticated roles */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: Leads table */}
      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LeadsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: Lead Distribution */}
      <Route
        path="/leads/distribution"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'System Architect', 'Sales Manager'
          ]}>
            <AppLayout>
              <LeadDistributionPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: Offers for Lead */}
      <Route
        path="/leads/:leadId/offers"
        element={
          <ProtectedRoute>
            <AppLayout>
              <OffersPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: Technical Issues */}
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <AppLayout>
                <TicketsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Protected: Booking Lookup */}
        <Route
          path="/bookings"
          element={
            <ProtectedRoute allowedRoles={[
              'Sales Agent', 'Sales Manager',
              'Customer Support Agent', 'Customer Support Manager',
              'CRM Developer', 'CRM Consultant', 'System Architect', 'Super CRM Administrator'
            ]}>
              <AppLayout>
                <BookingLookupPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

      {/* Protected: Analytics */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={analyticsRoles}>
            <AppLayout>
              <AnalyticsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Phase 6: Sales Kanban board */}
      <Route
        path="/kanban"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'Sales Agent', 'Sales Manager',
            'Executive User', 'System Architect', 'Business Analyst'
          ]}>
            <AppLayout>
              <SalesKanbanPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Phase 6: Executive Dashboard */}
      <Route
        path="/executive"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'Executive User',
            'Business Analyst', 'System Architect'
          ]}>
            <AppLayout>
              <ExecutiveDashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: Campaigns */}
      <Route
        path="/campaigns"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'Marketing Specialist',
            'Marketing Manager', 'Executive User', 'Business Analyst', 'System Architect'
          ]}>
            <AppLayout>
              <CampaignsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: Teams */}
      <Route
        path="/teams"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'System Architect',
            'Sales Manager', 'Sales Agent',
            'Customer Support Manager', 'Customer Support Agent',
            'Marketing Manager', 'Marketing Specialist'
          ]}>
            <AppLayout>
              <TeamsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: User Management */}
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['Super CRM Administrator', 'System Architect']}>
            <AppLayout>
              <UsersPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: User Profile */}
      <Route
        path="/users/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <UserProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: System Settings */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['Super CRM Administrator']}>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: CRM Dev Tools */}
      <Route
        path="/devtools"
        element={
          <ProtectedRoute allowedRoles={['CRM Developer', 'System Architect', 'Super CRM Administrator']}>
            <AppLayout>
              <DevToolsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Public: Campaign Lead Form */}
      <Route path="/form/:slug" element={<CampaignFormPage />} />

      {/* Unauthorized */}
      <Route
        path="/unauthorized"
        element={
          <AppLayout>
            <UnauthorizedPage />
          </AppLayout>
        }
      />

      {/* Catch-all */}
      <Route
        path="*"
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
