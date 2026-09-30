import React, { useLayoutEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { Button, ListRow } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { connectHealth, healthStatusText, syncHealth, useHealthStatus } from '@/lib/health';
import { todayKey } from '@/lib/dates';

/** "Apple Health" row for Profile: status plus Connect / Sync now. Free for everyone. */
export function HealthRow() {
  const { state, dispatch } = useStore();
  const status = useHealthStatus();
  const [busy, setBusy] = useState(false);
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  const getState = () => stateRef.current;
  const usable = status.unavailable === null;
  const connected = usable && status.meta.connected;
  const subtitle = healthStatusText(status, state.steps[todayKey()]);

  const connect = async () => {
    setBusy(true);
    try {
      if (await connectHealth()) await syncHealth(getState, dispatch);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ListRow
      icon={connected ? 'heart' : 'heart-outline'}
      title="Apple Health"
      subtitle={subtitle}
      onPress={connected ? () => Linking.openURL('x-apple-health://').catch(() => {}) : undefined}
      right={
        !usable ? undefined : connected ? (
          <Button small variant="secondary" title="Sync now" loading={status.syncing} onPress={() => syncHealth(getState, dispatch)} />
        ) : (
          <Button small title="Connect" loading={busy} onPress={connect} />
        )
      }
    />
  );
}
