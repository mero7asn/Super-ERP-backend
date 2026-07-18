import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import auxReducer from './auxSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    aux: auxReducer,
  },
});

export default store;
