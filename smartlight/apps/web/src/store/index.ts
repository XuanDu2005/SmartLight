/**
 * Redux store root — wires cart slice.
 *
 * Authentication is intentionally NOT in Redux: it lives in
 * `contexts/auth-context.tsx` because the auth lifecycle is bound to
 * the App component and a single HTTP-only refresh-token cookie.
 * Adding it to Redux would create two parallel sources of truth.
 */
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cart-slice';
import uiReducer from './ui-slice';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    ui: uiReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActions: ['cart/setError'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;