/**
 * Redux store root for the admin dashboard.
 *
 * Slices:
 *   - ui: theme, sidebar collapsed state, etc.
 */
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './ui-slice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;