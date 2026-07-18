import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchAuxConfig,
  fetchTeamAux,
  fetchMyPlan,
  changeAux as changeAuxThunk,
  enabledAuxesSelector,
  auxCountsSelector,
} from '../store/auxSlice';

// Backward-compatible replacement for the old useAux() context hook.
// Mirrors the prior AuxProvider: loads config/team/plan and polls every 30s.
export const useAux = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const currentAux = useSelector((state) => state.aux.currentAux);
  const statusSince = useSelector((state) => state.aux.statusSince);
  const todayStats = useSelector((state) => state.aux.todayStats);
  const myPlan = useSelector((state) => state.aux.myPlan);
  const teamAux = useSelector((state) => state.aux.teamAux);
  const auxConfig = useSelector((state) => state.aux.auxConfig);
  const enabledAuxes = useSelector(enabledAuxesSelector);
  const counts = useSelector(auxCountsSelector);

  const userId = user?._id;
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchAuxConfig());
    dispatch(fetchTeamAux(userId));
    dispatch(fetchMyPlan(userId));
    intervalRef.current = setInterval(() => dispatch(fetchTeamAux(userId)), 30000);
    return () => clearInterval(intervalRef.current);
  }, [dispatch, userId]);

  const changeAux = (status) => dispatch(changeAuxThunk(status));
  const fetchTeam = () => dispatch(fetchTeamAux(userId));

  return { currentAux, statusSince, todayStats, myPlan, teamAux, counts, changeAux, fetchTeam, auxConfig, enabledAuxes };
};
