import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import API from '../services/api';
import { useAuth } from './AuthContext';

const AuxContext = createContext(null);

export const AUX_COLORS = {
  Live: '#10B981',
  Training: '#F59E0B',
  Break: '#6366F1',
  Coaching: '#3B82F6',
  'Logged out': '#EF4444',
};

export const AUX_ICONS = {
  Live: '🟢',
  Training: '🟡',
  Break: '🟣',
  Coaching: '🔵',
  'Logged out': '🔴',
};

export const AuxProvider = ({ children }) => {
  const { user, updateCurrentUser } = useAuth();
  const [teamAux, setTeamAux] = useState([]);
  const [currentAux, setCurrentAux] = useState(user?.auxStatus || 'Logged out');
  // When the current status started (used for live ticking timer)
  const [statusSince, setStatusSince] = useState(Date.now());
  // Today's accumulated minutes per status (from server logs)
  const [todayStats, setTodayStats] = useState({ Live: 0, Break: 0, Training: 0, 'Logged out': 0 });
  // My planned minutes per day from schedule
  const [myPlan, setMyPlan] = useState(null);
  const intervalRef = useRef(null);

  const fetchTeam = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await API.get('/hrm/aux/team');
      const team = data.data || [];
      setTeamAux(team);
      const me = team.find(u => u._id === user._id);
      if (me) {
        setCurrentAux(me.auxStatus);
        if (me.todayStats) setTodayStats(me.todayStats);
        if (me.activeStatusSince) {
          setStatusSince(new Date(me.activeStatusSince).getTime());
        }
      }
    } catch { /* silent */ }
  }, [user]);

  // Fetch my schedule plan for current month
  const fetchMyPlan = useCallback(async () => {
    if (!user) return;
    try {
      const month = new Date().toISOString().slice(0, 7);
      const { data } = await API.get(`/hrm/aux/schedule?month=${month}&userId=${user._id}`);
      const sched = (data.data || [])[0];
      if (sched) setMyPlan(sched.monthlyPlan);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    fetchTeam();
    fetchMyPlan();
    intervalRef.current = setInterval(fetchTeam, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchTeam, fetchMyPlan]);

  const changeAux = async (status) => {
    try {
      const { data } = await API.put('/hrm/aux', { auxStatus: status });
      setCurrentAux(status);
      const serverSince = data.data?.statusSince;
      setStatusSince(serverSince ? new Date(serverSince).getTime() : Date.now());
      updateCurrentUser({ auxStatus: status });
      fetchTeam();
    } catch { /* silent */ }
  };

  const counts = {
    Live: teamAux.filter(u => u.auxStatus === 'Live').length,
    Training: teamAux.filter(u => u.auxStatus === 'Training').length,
    Break: teamAux.filter(u => u.auxStatus === 'Break').length,
    Coaching: teamAux.filter(u => u.auxStatus === 'Coaching').length,
    'Logged out': teamAux.filter(u => u.auxStatus === 'Logged out').length,
  };

  return (
    <AuxContext.Provider value={{ currentAux, statusSince, todayStats, myPlan, teamAux, counts, changeAux, fetchTeam }}>
      {children}
    </AuxContext.Provider>
  );
};

export const useAux = () => useContext(AuxContext);
