import { Icon } from '../components/Icons';

const UnauthorizedPage = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
    <div style={{ marginBottom: '24px', color: 'var(--accent-danger)' }}>
      <Icon name="lock" size={64} />
    </div>
    <h1 style={{ fontSize: '28px', marginBottom: '12px' }}>Access Denied</h1>
    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '15px' }}>
      You don't have permission to view this page. 
      Please contact your administrator if you believe this is a mistake.
    </p>
  </div>
);

export default UnauthorizedPage;
