import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import TeamBoard from '../components/TeamBoard';

const PageHeader = ({ title, subtitle, icon, stats }) => (
  <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
    <div>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon}
        {title}
      </h1>
      <p className="page-subtitle">{subtitle}</p>
    </div>
    {stats && (
      <div style={{ display: 'flex', gap: 12 }}>
        {stats.map(s => (
          <div key={s.label} className="table-wrapper" style={{ padding: '12px 18px', textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const AllTeamsPage = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [execNode, setExecNode] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [allManagers, setAllManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(user?.role);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/auth/teams');
      setTeams(data.teams || []);
      setExecNode(data.execNode || []);
      setUnassigned([
        ...(data.unassignedMembers || []),
        ...(data.unassignedManagers || []),
        ...(data.unassignedDirects || []),
      ]);
      setAllManagers(data.teams.map(t => t.manager).concat(
        (data.execNode || []).flatMap(n => n.directReports)
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const assignMember = async (memberId, supervisorId) => {
    setError(''); setSuccess('');
    try {
      await API.put(`/auth/users/${memberId}`, { supervisor: supervisorId || null });
      setSuccess('Team updated successfully');
      fetchTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update team');
    }
  };

  if (loading) return <div className="loading-state"><div className="spinner" />Loading teams…</div>;

  const memberCount = teams.reduce((s, t) => s + t.members.length, 0)
    + execNode.reduce((s, n) => s + n.directReports.length, 0);

  return (
    <div>
      <PageHeader
        title="All Teams"
        subtitle="The full organization hierarchy and who reports to who"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        }
        stats={[
          { label: 'Teams', value: teams.length + execNode.length, color: 'var(--accent-primary)' },
          { label: 'Members', value: memberCount, color: '#10B981' },
          { label: 'Unassigned', value: unassigned.length, color: unassigned.length > 0 ? '#EF4444' : '#10B981' },
        ]}
      />

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <TeamBoard
        teams={teams}
        execNode={execNode}
        unassigned={unassigned}
        isAdmin={isAdmin}
        allManagers={allManagers}
        onMove={assignMember}
        highlightManagerId={user?._id}
      />
    </div>
  );
};

export default AllTeamsPage;
