import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import AuxTopBar from './components/AuxTopBar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import LeadDistributionPage from './pages/LeadDistributionPage';
import LeadDetailsPage from './pages/LeadDetailsPage';
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
import MyTeamPage from './pages/MyTeamPage';
import AllTeamsPage from './pages/AllTeamsPage';
import SettingsPage from './pages/SettingsPage';
import DevToolsPage from './pages/DevToolsPage';
import CampaignFormPage from './pages/CampaignFormPage';
import PaymentPage from './pages/PaymentPage';
import EmailsPage from './pages/EmailsPage';
import SentEmailsPage from './pages/SentEmailsPage';
import RtmMonitorPage from './pages/RtmMonitorPage';
import HrmDashboardPage from './pages/hrm/HrmDashboardPage';
import PersonalPage from './pages/hrm/PersonalPage';
import PayrollPage from './pages/hrm/PayrollPage';
import TrainingPage from './pages/hrm/TrainingPage';
import TalentAcquisitionPage from './pages/hrm/TalentAcquisitionPage';
import PartnershipsPage from './pages/hrm/PartnershipsPage';
import MySchedulePage from './pages/ess/MySchedulePage';
import MyPayrollPage from './pages/ess/MyPayrollPage';
import { useAuth } from './context/AuthContext';

// Layout wrapper: renders Sidebar + content for authenticated pages
const AppLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AuxTopBar />
        <main className="main-content" style={{ marginTop: 48 }}>{children}</main>
      </div>
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

      {/* Protected: Lead Details (Unified Offers/Notes etc) */}
      <Route
        path="/leads/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LeadDetailsPage />
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

      {/* Protected: Teams — split into "My Team" and "All Teams" */}
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
      <Route
        path="/teams/my"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'System Architect',
            'Sales Manager', 'Sales Agent',
            'Customer Support Manager', 'Customer Support Agent',
            'Marketing Manager', 'Marketing Specialist'
          ]}>
            <AppLayout>
              <MyTeamPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/all"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'System Architect',
            'Sales Manager', 'Sales Agent',
            'Customer Support Manager', 'Customer Support Agent',
            'Marketing Manager', 'Marketing Specialist'
          ]}>
            <AppLayout>
              <AllTeamsPage />
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

      {/* Protected: Internal Emails */}
      <Route
        path="/emails"
        element={
          <ProtectedRoute>
            <AppLayout>
              <EmailsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: Sent Emails / Email History */}
      <Route
        path="/emails/sent"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SentEmailsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: RTM Live Monitor */}
      <Route
        path="/rtm"
        element={
          <ProtectedRoute allowedRoles={[
            'RTM Team Member', 'Super CRM Administrator',
            'HRM System Administrator', 'HR Manager'
          ]}>
            <AppLayout>
              <RtmMonitorPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: HRM Dashboard */}
      <Route
        path="/hrm"
        element={
          <ProtectedRoute>
            <AppLayout>
              <HrmDashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: HRM Personal */}
      <Route
        path="/hrm/personal"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'HRM System Administrator', 'HR Manager',
            'HR Specialist (Generalist)', 'HR Business Partner', 'Employee (General User)'
          ]}>
            <AppLayout>
              <PersonalPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: HRM Payroll */}
      <Route
        path="/hrm/payroll"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'HRM System Administrator', 'HR Manager',
            'Payroll Specialist', 'Employee (General User)'
          ]}>
            <AppLayout>
              <PayrollPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: Employee Self-Service — My Schedule */}
      <Route
        path="/ess/schedule"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MySchedulePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: Employee Self-Service — My Payroll */}
      <Route
        path="/ess/payroll"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MyPayrollPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: HRM Training */}
      <Route
        path="/hrm/training"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'HRM System Administrator', 'HR Manager',
            'Training and Development Specialist', 'Employee (General User)'
          ]}>
            <AppLayout>
              <TrainingPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: HRM Talent Acquisition */}
      <Route
        path="/hrm/talent"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'HRM System Administrator', 'HR Manager',
            'Recruitment Specialist (Talent Acquisition)'
          ]}>
            <AppLayout>
              <TalentAcquisitionPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected: HRM Partnerships */}
      <Route
        path="/hrm/partnerships"
        element={
          <ProtectedRoute allowedRoles={[
            'Super CRM Administrator', 'HRM System Administrator', 'HR Manager',
            'HR Business Partner', 'Employee (General User)'
          ]}>
            <AppLayout>
              <PartnershipsPage />
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

      {/* Public: Offer Payment Page */}
      <Route path="/pay/:token" element={<PaymentPage />} />

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
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
