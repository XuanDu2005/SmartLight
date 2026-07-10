/**
 * UI slice — cross-cutting UI flags (theme, sidebar open, search modal, ...).
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark';

export interface UiState {
  theme: ThemeMode;
  isMobileNavOpen: boolean;
  isSearchOpen: boolean;
}

const STORAGE_KEY = 'smartlight.ui.theme';
const initialTheme: ThemeMode =
  (typeof window !== 'undefined' &&
    (window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null)) ||
  'light';

const initialState: UiState = {
  theme: initialTheme,
  isMobileNavOpen: false,
  isSearchOpen: false,
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
    toggleMobileNav(state, action: PayloadAction<boolean | undefined>) {
      state.isMobileNavOpen = action.payload ?? !state.isMobileNavOpen;
    },
    toggleSearch(state, action: PayloadAction<boolean | undefined>) {
      state.isSearchOpen = action.payload ?? !state.isSearchOpen;
    },
  },
});

export const { setTheme, toggleMobileNav, toggleSearch } = uiSlice.actions;
export default uiSlice.reducer;