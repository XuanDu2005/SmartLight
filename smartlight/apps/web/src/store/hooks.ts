/**
 * Typed Redux hooks — use throughout the app instead of plain
 * `useSelector` / `useDispatch` so types flow through.
 */
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { AppDispatch, RootState } from './index';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;