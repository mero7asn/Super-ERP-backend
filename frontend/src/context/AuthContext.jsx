import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  login as loginThunk,
  logout as logoutAction,
  updateCurrentUser as updateCurrentUserAction,
  clearError as clearErrorAction,
} from '../store/authSlice';

// Backward-compatible replacement for the old useAuth() context hook.
export const useAuth = () => {
  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);
  const error = useSelector((state) => state.auth.error);

  const login = useCallback((email, password) => loginThunk(email, password), []);
  const logout = useCallback(() => logoutAction(), []);
  const updateCurrentUser = useCallback((data) => updateCurrentUserAction(data), []);
  const clearError = useCallback(() => clearErrorAction(), []);

  return { user, loading, error, login, logout, updateCurrentUser, clearError };
};
