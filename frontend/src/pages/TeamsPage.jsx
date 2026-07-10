import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const DEPT_COLORS = {
  'Sales': { c1: '#2563EB', c2: '#14B8A6', badge: 'badge-new', icon: '💼' },
  'Customer Support': { c1: '#F59E0B', c2: '#F97316', badge: 'badge-converted', icon: '🎧' },
  'Marketing': { c1: '#8B5CF6', c2: '#EC4899', badge: 'badge-meta', icon: '📣' },
  'Technology': { c1: '#10B981', c2: '#14B8A6', badge: 'badge-qualified', icon: '⚙️' },
  'Personal': { c1: '#3B82F6', c2: '#60A5FA', badge: 'badge-new', icon: '👤' },
  'Payroll': { c1: '#10B981', c2: '#34D399', badge: 'badge-qualified', icon: '💵' },
  'Training': { c1: '#F59E0B', c2: '#FBBF24', badge: 'badge-converted', icon: '📚' },
  'Talent Acquisition': { c1: '#8B5CF6', c2: '#A78BFA', badge: 'badge-meta', icon: '🎯' },
  'BD & People Culture': { c1: '#EC4899', c2: '#F472B6', badge: 'badge-meta', icon: '🤝' },
};

const Avatar = ({ firstName, lastName, size = 36, colors }) => {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  const bg = colors
    ? `linear-gradient(135deg, ${colors.c1}, ${colors.c2})`
    : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff',
    }}>{initials}</div>
  );
};

const MemberCard = ({ member, dept, isAdmin, managers, onMove }) => {
  const colors = dept ? DEPT_COLORS[dept] : null;
  const [isMoving, setIsMoving] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  
  const handleMove = async (e) => {
    const newSupervisorId = e.target.value;
    if (!newSupervisorId) return;
    
    setIsMoving(true);
    await onMove(member._id, newSupervisorId === 'none' ? null : newSupervisorId);
    setIsMoving(false);
    setSelectValue('');
  };
  
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      background: 'var(--bg-secondary)', borderRadius: 8,
      border: '1px solid var(--border-color)',
      opacity: isMoving ? 0.5 : 1,
      transition: 'opacity 0.2s',
      pointerEvents: isMoving ? 'none' : 'auto'
    }}>
      <Avatar firstName={member.firstName} lastName={member.lastName} size={36} colors={colors} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {member.firstName} {member.lastName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {member.role}
        </div>
      </div>
      {isAdmin && (
        <select
          value={selectValue}
          onChange={handleMove}
          disabled={isMoving}
          style={{ 
            fontSize: 11, padding: '4px 8px', borderRadius: 6, 
            border: '1px solid var(--border-color)', 
            background: 'var(--bg-card)', 
            color: 'var(--text-primary)', 
            cursor: isMoving ? 'wait' : 'pointer',
            minWidth: 120
          }}
        >
          <option value="">Move to…</option>
          <option value="none">✕ Unassign</option>
          {managers.filter(m => m._id !== member._id).map(m => (
            <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>
          ))}
        </select>
      )}
    </div>
  );
};

const TeamsPage = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [allManagers, setAllManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(user?.role);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/auth/teams');
      setTeams(data.teams);
      setUnassigned(data.unassignedMembers || []);
      setAllManagers(data.teams.map(t => t.manager));
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

  const departments = [
    'All', 'Sales', 'Customer Support', 'Marketing', 'Technology',
    'Personal', 'Payroll', 'Training', 'Talent Acquisition', 'BD & People Culture'
  ];
  const filteredTeams = activeTab === 'All' ? teams : teams.filter(t => t.department === activeTab);
  const filteredUnassigned = activeTab === 'All' ? unassigned : unassigned.filter(u => {
    const deptMap = {
      Sales: ['Sales Agent'],
      'Customer Support': ['Customer Support Agent'],
      Marketing: ['Marketing Specialist'],
      Technology: ['CRM Developer', 'CRM Consultant'],
      Personal: ['HR Specialist (Generalist)', 'Employee (General User)'],
      Payroll: ['Payroll Specialist'],
      Training: ['Training and Development Specialist'],
      'Talent Acquisition': ['Recruitment Specialist (Talent Acquisition)'],
      'BD & People Culture': ['HR Business Partner']
    };
    return deptMap[activeTab]?.includes(u.role);
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Teams
          </h1>
          <p className="page-subtitle">Manage department teams and member assignments</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Teams', value: teams.length, color: 'var(--accent-primary)' },
            { label: 'Members', value: teams.reduce((s, t) => s + t.members.length, 0), color: '#10B981' },
            { label: 'Unassigned', value: unassigned.length, color: unassigned.length > 0 ? '#EF4444' : '#10B981' },
          ].map(s => (
            <div key={s.label} className="table-wrapper" style={{ padding: '12px 18px', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Department tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 0 }}>
        {departments.map(dept => (
          <button key={dept} onClick={() => setActiveTab(dept)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: activeTab === dept ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === dept ? '2px solid var(--accent-primary)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s',
          }}>
            {DEPT_COLORS[dept]?.icon || ''} {dept}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Department Teams */}
        {filteredTeams.map(({ manager, department, members }) => {
          const colors = DEPT_COLORS[department];
          return (
            <div key={manager._id} className="table-wrapper" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Team Header */}
              <div style={{ 
                padding: '20px 24px', 
                borderBottom: '1px solid var(--border-color)', 
                background: `linear-gradient(135deg, ${colors.c1}08, ${colors.c2}08)`,
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12,
                  background: `linear-gradient(135deg, ${colors.c1}20, ${colors.c2}20)`,
                  border: `2px solid ${colors.c1}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28
                }}>
                  {colors.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{department}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 13 }}>
                    <Avatar firstName={manager.firstName} lastName={manager.lastName} size={24} colors={colors} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {manager.firstName} {manager.lastName}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {manager.role}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: colors.c1, lineHeight: 1 }}>{members.length}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>member{members.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              
              {/* Team Members */}
              <div style={{ padding: '20px 24px', minHeight: 80 }}>
                {members.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '32px 0', 
                    color: 'var(--text-muted)', 
                    fontSize: 13 
                  }}>
                    No members assigned to this team yet
                  </div>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
                    gap: 12 
                  }}>
                    {members.map(m => (
                      <MemberCard 
                        key={m._id} 
                        member={m} 
                        dept={department} 
                        isAdmin={isAdmin} 
                        managers={allManagers} 
                        onMove={assignMember} 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Unassigned members */}
        {filteredUnassigned.length > 0 && (
          <div className="table-wrapper" style={{ padding: 0, overflow: 'hidden', border: '2px dashed rgba(239,68,68,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(239,68,68,0.05)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>⚠️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Unassigned Members</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>These members need to be assigned to a team</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>{filteredUnassigned.length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>unassigned</div>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
                {filteredUnassigned.map(m => (
                  <MemberCard key={m._id} member={m} dept={null} isAdmin={isAdmin} managers={allManagers} onMove={assignMember} />
                ))}
              </div>
            </div>
          </div>
        )}

        {filteredTeams.length === 0 && filteredUnassigned.length === 0 && (
          <div className="table-wrapper" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            No teams found for this department
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamsPage;
