/**
 * Admin UI slice — sidebar collapse + theme.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark';

export interface UiState {
  theme: ThemeMode;
  isSidebarCollapsed: boolean;
}

const STORAGE_KEY = 'smartlight.admin.theme';
const initialTheme: ThemeMode =
  (typeof window !== 'undefined' &&
    (window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null)) ||
  'light';

const initialState: UiState = {
  theme: initialTheme,
  isSidebarCollapsed: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, action.payload);
      }
    },
    toggleSidebar(state, action: PayloadAction<boolean | undefined>) {
      state.isSidebarCollapsed = action.payload ?? !state.isSidebarCollapsed;
    },
  },
});

export const { setTheme, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;