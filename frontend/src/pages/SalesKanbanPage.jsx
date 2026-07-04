import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import API from '../services/api';
import { Icon } from '../components/Icons';

const COLUMNS = [
  { id: 'New',       label: 'New',       icon: 'plus', color: '#4f6ef7' },
  { id: 'Contacted', label: 'Contacted', icon: 'phone', color: '#06b6d4' },
  { id: 'Qualified', label: 'Qualified', icon: 'like', color: '#f59e0b' },
  { id: 'Converted', label: 'Converted', icon: 'check', color: '#22c55e' },
  { id: 'Lost',      label: 'Lost',      icon: 'close', color: '#ef4444' },
];

const sourceBadgeStyle = (src) => ({
  background: src === 'Meta' ? 'rgba(24,119,242,0.15)' : 'rgba(219,68,55,0.15)',
  color: src === 'Meta' ? '#4e8ef0' : '#e06355',
});

const SalesKanbanPage = () => {
  const [board, setBoard] = useState(() =>
    Object.fromEntries(COLUMNS.map(c => [c.id, []]))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data } = await API.get('/leads');
        const grouped = Object.fromEntries(COLUMNS.map(c => [c.id, []]));
        (data.data || []).forEach(lead => {
          if (grouped[lead.status]) grouped[lead.status].push(lead);
          else grouped['New'].push(lead);
        });
        setBoard(grouped);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load leads');
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const srcCol = [...board[source.droppableId]];
    const dstCol = source.droppableId === destination.droppableId ? srcCol : [...board[destination.droppableId]];
    const [moved] = srcCol.splice(source.index, 1);
    moved.status = destination.droppableId;
    dstCol.splice(destination.index, 0, moved);

    setBoard(prev => ({
      ...prev,
      [source.droppableId]: srcCol,
      [destination.droppableId]: dstCol,
    }));

    try {
      await API.put(`/leads/${draggableId}`, { status: destination.droppableId });
    } catch {
      // Silently revert would go here in production
    }
  };

  const filterLead = (lead) =>
    !search ||
    lead.name?.toLowerCase().includes(search.toLowerCase()) ||
    lead.email?.toLowerCase().includes(search.toLowerCase());

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="kanban" size={26} style={{ color: 'var(--accent-primary)' }} />
            Sales Dashboard
          </h1>
          <p className="page-subtitle">Drag & drop leads across stages to update their status instantly</p>
        </div>
        <input
          className="table-search"
          placeholder="Search leads…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ alignSelf: 'center' }}
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-state"><div className="spinner" />Loading leads…</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
            {COLUMNS.map(col => {
              const leads = board[col.id].filter(filterLead);
              return (
                <div key={col.id} style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column' }}>
                  {/* Column Header */}
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderTop: `3px solid ${col.color}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name={col.icon} size={16} style={{ color: col.color }} />
                      {col.label}
                    </span>
                    <span style={{
                      background: `${col.color}22`,
                      color: col.color,
                      borderRadius: 12,
                      padding: '2px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                    }}>{leads.length}</span>
                  </div>

                  {/* Droppable column */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          flex: 1,
                          minHeight: 200,
                          background: snapshot.isDraggingOver
                            ? `${col.color}0d`
                            : 'transparent',
                          border: snapshot.isDraggingOver
                            ? `1px dashed ${col.color}55`
                            : '1px dashed transparent',
                          borderRadius: 'var(--radius-md)',
                          padding: 4,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {leads.map((lead, index) => (
                          <Draggable key={lead._id} draggableId={lead._id} index={index}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                style={{
                                  background: snap.isDragging ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '14px',
                                  marginBottom: 8,
                                  boxShadow: snap.isDragging ? 'var(--shadow-md)' : 'none',
                                  cursor: 'grab',
                                  transition: 'box-shadow 0.15s ease',
                                  ...prov.draggableProps.style,
                                }}
                              >
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{lead.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {lead.email}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{
                                    ...sourceBadgeStyle(lead.source),
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: 10,
                                  }}>{lead.source}</span>
                                  {lead.phone && (
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <Icon name="phone" size={10} />
                                      {lead.phone}
                                    </span>
                                  )}
                                </div>
                                {lead.assignedTo && (
                                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{
                                      width: 18, height: 18,
                                      background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                      borderRadius: '50%',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 9,
                                      color: '#fff',
                                      fontWeight: 700,
                                    }}>
                                      {(lead.assignedTo.firstName?.[0] || '?')}
                                    </span>
                                    {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {leads.length === 0 && !snapshot.isDraggingOver && (
                          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                            Drop here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
};

export default SalesKanbanPage;
