import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reducer, initialState, type Action } from './reducer';
import type { AppState } from '@/lib/types';
import { todayKey } from '@/lib/dates';

const STORAGE_KEY = 'fitness-buddy:state:v1';

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  ready: boolean;
  /** The day the Today screen is showing. */
  selectedDate: string;
  setSelectedDate: (d: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) dispatch({ type: 'hydrate', state: JSON.parse(raw) });
      })
      .catch((e) => console.warn('Failed to load saved data', e))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) => console.warn('Failed to save', e));
    }, 300);
  }, [state, ready]);

  const value = useMemo(
    () => ({ state, dispatch, ready, selectedDate, setSelectedDate }),
    [state, ready, selectedDate],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
