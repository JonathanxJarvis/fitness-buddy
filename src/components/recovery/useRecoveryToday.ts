import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/StoreProvider';
import { todayKey } from '@/lib/dates';
import { planDay, sessionChoices, type Session } from '@/lib/plan';
import { muscleRecovery, rankSessions, type Candidate, type RecoveryState } from '@/lib/recovery';

const toCandidate = (s: Session): Candidate => ({ id: s.id, name: s.name, exercises: s.routine.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets })) });

/** Today's recovery, plus the plan sessions and saved workouts ranked by how well they fit it. */
export function useRecoveryToday() {
  const { state } = useStore();
  // Recovery moves slowly: a clock that ticks once a minute is plenty.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    const custom = state.customExercises;
    const rec = muscleRecovery(state.workouts, now, custom);
    const sessions = sessionChoices(state);
    const byId = new Map(sessions.map((s) => [s.id, s]));
    const ranked = rankSessions(sessions.map(toCandidate), rec, custom).map((fit) => ({ ...fit, session: byId.get(fit.candidate.id)! }));
    const today = planDay(state, todayKey());
    const planned = today.kind === 'train' ? (ranked.find((f) => f.candidate.id === today.session.id) ?? ranked.find((f) => f.session.name === today.session.name)) : undefined;
    const counts: Record<RecoveryState, number> = { fresh: 0, recovering: 0, tired: 0 };
    for (const r of Object.values(rec)) counts[r.state]++;
    const anyRecent = Object.values(rec).some((r) => r.lastTrained !== undefined);
    return { rec, ranked, planned, restDay: today.kind === 'rest', counts, anyRecent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.workouts, state.customExercises, state.plan, state.routines, now]);
}
