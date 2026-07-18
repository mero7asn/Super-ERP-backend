import { useState } from 'react';

export const DEPT_COLORS = {
  'Sales': { c1: '#2563EB', c2: '#14B8A6', badge: 'badge-new', icon: '💼' },
  'Customer Support': { c1: '#F59E0B', c2: '#F97316', badge: 'badge-converted', icon: '🎧' },
  'Marketing': { c1: '#8B5CF6', c2: '#EC4899', badge: 'badge-meta', icon: '📣' },
  'Technology': { c1: '#10B981', c2: '#14B8A6', badge: 'badge-qualified', icon: '⚙️' },
  'Personal': { c1: '#3B82F6', c2: '#60A5FA', badge: 'badge-new', icon: '👤' },
  'Payroll': { c1: '#10B981', c2: '#34D399', badge: 'badge-qualified', icon: '💵' },
  'Training': { c1: '#F59E0B', c2: '#FBBF24', badge: 'badge-converted', icon: '📚' },
  'Talent Acquisition': { c1: '#8B5CF6', c2: '#A78BFA', badge: 'badge-meta', icon: '🎯' },
  'BD & People Culture': { c1: '#EC4899', c2: '#F472B6', badge: 'badge-meta', icon: '🤝' },
  'Other': { c1: '#64748B', c2: '#94A3B8', badge: 'badge-new', icon: '👥' },
};

export const Avatar = ({ firstName, lastName, size = 36, colors }) => {
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

export const MemberCard = ({ member, dept, isAdmin, managers, onMove, compact }) => {
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
      opacity: isMoving ? 0.5 : 1, pointerEvents: isMoving ? 'none' : 'auto',
      transition: 'opacity 0.2s',
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
      {isAdmin && !compact && (
        <select
          value={selectValue}
          onChange={handleMove}
          disabled={isMoving}
          style={{
            fontSize: 11, padding: '4px 8px', borderRadius: 6,
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)', color: 'var(--text-primary)',
            cursor: isMoving ? 'wait' : 'pointer', minWidth: 120,
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

// Renders a single department team card.
const TeamCard = ({ team, isAdmin, allManagers, onMove, highlightManagerId }) => {
  const { manager, department, members } = team;
  const colors = DEPT_COLORS[department] || DEPT_COLORS.Other;
  const isMyTeam = highlightManagerId && manager._id.toString() === highlightManagerId.toString();
  return (
    <div className="table-wrapper" style={{ padding: 0, overflow: 'hidden', border: isMyTeam ? `2px solid ${colors.c1}` : '1px solid var(--border-color)' }}>
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
        background: `linear-gradient(135deg, ${colors.c1}08, ${colors.c2}08)`,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: `linear-gradient(135deg, ${colors.c1}20, ${colors.c2}20)`,
          border: `2px solid ${colors.c1}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>{colors.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{department}</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 13 }}>
            <Avatar firstName={manager.firstName} lastName={manager.lastName} size={24} colors={colors} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {manager.firstName} {manager.lastName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{manager.role}</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.c1, lineHeight: 1 }}>{members.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>member{members.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div style={{ padding: '20px 24px', minHeight: 80 }}>
        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No members assigned to this team yet
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {members.map(m => (
              <MemberCard key={m._id} member={m} dept={department} isAdmin={isAdmin} managers={allManagers} onMove={onMove} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Renders the executive node — who reports to the executive (the full
// "who reports to who" hierarchy).
const ExecNode = ({ node, isAdmin, allManagers, onMove }) => {
  const colors = DEPT_COLORS.Other;
  const exec = node.executive;
  return (
    <div className="table-wrapper" style={{ padding: 0, overflow: 'hidden', border: '2px solid rgba(99,102,241,0.4)' }}>
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
        background: 'linear-gradient(135deg, #6366F108, #8B5CF608)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12, fontSize: 28,
          background: 'linear-gradient(135deg, #6366F120, #8B5CF620)',
          border: '2px solid #6366F140',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>👑</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Executive — {exec.firstName} {exec.lastName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {node.directReports.length} direct report{node.directReports.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      <div style={{ padding: '20px 24px' }}>
        {node.directReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No direct reports
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {node.directReports.map(r => (
              <MemberCard key={r._id} member={r} dept={null} isAdmin={isAdmin} managers={allManagers} onMove={onMove} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Shared board used by both "My Team" and "All Teams" pages.
const TeamBoard = ({ teams, execNode, unassigned, isAdmin, allManagers, onMove, highlightManagerId }) => {
  const hasContent = (teams && teams.length) || (execNode && execNode.length) || (unassigned && unassigned.length);
  if (!hasContent) {
    return (
      <div className="table-wrapper" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
        No teams to display.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {(execNode || []).map(node => (
        <ExecNode key={node.executive._id} node={node} isAdmin={isAdmin} allManagers={allManagers} onMove={onMove} />
      ))}

      {(teams || []).map(team => (
        <TeamCard
          key={team.manager._id}
          team={team}
          isAdmin={isAdmin}
          allManagers={allManagers}
          onMove={onMove}
          highlightManagerId={highlightManagerId}
        />
      ))}

      {(unassigned && unassigned.length > 0) && (
        <div className="table-wrapper" style={{ padding: 0, overflow: 'hidden', border: '2px dashed rgba(239,68,68,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(239,68,68,0.05)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Unassigned Members</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>These members need to be assigned to a team</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>{unassigned.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>unassigned</div>
            </div>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
              {unassigned.map(m => (
                <MemberCard key={m._id} member={m} dept={null} isAdmin={isAdmin} managers={allManagers} onMove={onMove} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamBoard;
