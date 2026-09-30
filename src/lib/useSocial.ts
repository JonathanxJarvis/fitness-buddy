import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/StoreProvider';
import { DEMO, demoCrew, demoOpener, fetchFriends, makeSnapshot, publish, register } from './social';

/**
 * Signs you up for the social layer the first time it's opened, publishes your
 * progression snapshot, and keeps the friend list fresh.
 */
export function useSocial() {
  const { state, dispatch } = useStore();
  const social = state.social ?? { friends: [], chats: {}, read: {} };
  const me = social.me;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const starting = useRef(false);

  useEffect(() => {
    if (me || starting.current || !state.profile) return;
    starting.current = true;
    const snap = makeSnapshot(state);
    if (!snap) return;
    register(snap)
      .then((m) => {
        dispatch({ type: 'setSocialMe', me: m });
        if (DEMO && !social.friends.length) {
          const crew = demoCrew();
          dispatch({ type: 'setFriends', friends: crew });
          crew.forEach((f, i) => {
            const hello = demoOpener(f.id, Date.now() - (i + 1) * 3600_000);
            if (hello) dispatch({ type: 'addMessages', friendId: f.id, messages: [hello] });
          });
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        starting.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, state.profile]);

  const refresh = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const snap = makeSnapshot(state);
      if (snap) await publish(me, snap);
      dispatch({ type: 'setFriends', friends: await fetchFriends(me, social.friends) });
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, state.workouts, state.profile, social.friends]);

  useEffect(() => {
    if (me) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  return { me, social, error, loading, refresh };
}
