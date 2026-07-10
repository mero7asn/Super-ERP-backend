import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const HrmDashboardPage = () => {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Super HRM Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.firstName}! Manage human resources, talent acquisition, payroll, and training.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Card 1: Personal */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 24 }}>📁</div>
          <h3 style={{ margin: 0 }}>Personal Department</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Manage employee contracts, Egyptian governmental compliance documents, profiles, schedules, and leaves.
          </p>
          <Link to="/hrm/personal" className="btn btn-secondary btn-sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
            Open Module
          </Link>
        </div>

        {/* Card 2: Payroll */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 24 }}>💵</div>
          <h3 style={{ margin: 0 }}>Payroll Department</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Process monthly salaries, manage deductions, log achievements & KPIs, and review 10% annual salary growth.
          </p>
          <Link to="/hrm/payroll" className="btn btn-secondary btn-sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
            Open Module
          </Link>
        </div>

        {/* Card 3: Training */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 24 }}>🎓</div>
          <h3 style={{ margin: 0 }}>Training Department</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Log HR training courses, assign technical supervisor tutorials, update AUX presence status, and review follow-up reports.
          </p>
          <Link to="/hrm/training" className="btn btn-secondary btn-sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
            Open Module
          </Link>
        </div>

        {/* Card 4: Talent Acquisition */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 24 }}>🔍</div>
          <h3 style={{ margin: 0 }}>Talent Acquisition</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Open job vacancies, review resumes, track recruitment stages (Applied to Hired), and coordinate hires.
          </p>
          <Link to="/hrm/talent" className="btn btn-secondary btn-sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
            Open Module
          </Link>
        </div>

        {/* Card 5: BD & People Culture */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 24 }}>🤝</div>
          <h3 style={{ margin: 0 }}>BD & People Culture</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Record corporate discounts, medical insurance schemes, company partnerships, and benefits programs.
          </p>
          <Link to="/hrm/partnerships" className="btn btn-secondary btn-sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
            Open Module
          </Link>
        </div>
      </div>

      {/* Internal emails promo banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(124,58,237,0.1))',
        border: '1px solid rgba(37,99,235,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0' }}>Communicate Instantly</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Need to coordinate between CRM and HRM? Use the secure, non-deletable internal email system.
          </p>
        </div>
        <Link to="/emails" className="btn btn-primary btn-sm">
          Go to Emails
        </Link>
      </div>
    </div>
  );
};

export default HrmDashboardPage;
