import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Kettle, usePop, type Mood } from './Mascot';
import { T } from './ui';
import { useStore } from '@/store/StoreProvider';
import { mascotLine, type MascotEvent } from '@/lib/mascotLines';
import { progression } from '@/lib/progression';
import { doneSets, prExercises } from '@/lib/training';
import { itemNutrients } from '@/lib/nutrition';
import { todayKey } from '@/lib/dates';
import { useTheme } from '@/theme';
import { mascotSkin } from '@/lib/pro';

interface Toast {
  id: number;
  text: string;
  mood: Mood;
}

const PRIORITY: Record<MascotEvent, number> = { rankUp: 5, levelUp: 4, pr: 3, proteinHit: 2, workoutDone: 2, workoutStart: 2, meal: 1, water: 1, setDone: 0, streak: 1, hello: 0 };

/**
 * Watches the app state and has Kettle pop up in the top corner when something
 * worth cheering happens: a workout starts or ends, a PR, a rank-up, a meal logged.
 */
export function MascotToast() {
  const { state, ready } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prev = useRef<null | { active: string | null; workouts: number; entries: number; sets: number; protein: number; water: number; level: number; stage: number }>(null);
  const enabled = state.settings.mascot !== false;
  const pop = usePop(!!toast);

  const prog = useMemo(
    () => (state.profile ? progression(state.workouts, state.profile.weightKg, state.profile.sex, todayKey()) : null),
    [state.workouts, state.profile],
  );
  const today = todayKey();
  const protein = useMemo(() => state.entries.filter((e) => e.date === today).reduce((s, e) => s + itemNutrients(e).protein, 0), [state.entries, today]);
  const band = prog?.stage.tier.color ?? colors.primary;

  const show = (event: MascotEvent, vars: Record<string, string | number> = {}) => {
    const line = mascotLine(event, { name: state.profile?.name?.split(' ')[0] ?? 'champ', rank: prog?.stage.label ?? 'Rookie', level: prog?.level ?? 1, ...vars });
    setToast({ id: Date.now(), ...line });
    if (event !== 'setDone') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setToast(null), event === 'rankUp' || event === 'levelUp' ? 4200 : 3000);
  };

  useEffect(() => {
    if (!ready || !prog) return;
    const now = {
      active: state.activeWorkout?.id ?? null,
      workouts: state.workouts.length,
      entries: state.entries.length,
      sets: state.activeWorkout ? doneSets(state.activeWorkout) : 0,
      protein,
      water: state.water[today] ?? 0,
      level: prog.level,
      stage: prog.stage.index,
    };
    const p = prev.current;
    prev.current = now;
    if (!p || !enabled) return;

    // Pick the single most important thing that just happened.
    const events: [MascotEvent, Record<string, string | number>][] = [];
    if (now.stage > p.stage) events.push(['rankUp', {}]);
    if (now.level > p.level) events.push(['levelUp', {}]);
    if (now.workouts > p.workouts) {
      const w = state.workouts[state.workouts.length - 1];
      const earlier = state.workouts.filter((x) => x.startedAt < w.startedAt);
      if (prExercises(w, earlier).length) events.push(['pr', {}]);
      events.push(['workoutDone', { n: doneSets(w) }]);
    }
    if (now.active && now.active !== p.active) events.push(['workoutStart', {}]);
    if (now.active && now.sets > p.sets && now.sets % 3 === 0) events.push(['setDone', {}]);
    const goal = state.goals?.protein ?? Infinity;
    if (now.protein >= goal && p.protein < goal) events.push(['proteinHit', {}]);
    if (now.entries > p.entries) {
      const e = state.entries[state.entries.length - 1];
      events.push(['meal', { food: e?.food.name.split(',')[0] ?? 'that' }]);
    }
    if (now.water > p.water) events.push(['water', {}]);
    if (!events.length) return;
    events.sort((a, b) => PRIORITY[b[0]] - PRIORITY[a[0]]);
    show(...events[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.activeWorkout, state.workouts, state.entries, state.water, protein, prog]);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  if (!toast) return null;

  const content = (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 6, right: 10, left: 60, alignItems: 'flex-end' }}>
      <Pressable onPress={() => setToast(null)} accessibilityRole="alert" accessibilityLabel={toast.text}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <AnimatedBubble pop={pop}>
            <View style={{ backgroundColor: colors.ink, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, borderBottomRightRadius: 4, maxWidth: 230, marginBottom: 18 }}>
              <T size={13} weight="700" color={colors.onInk}>{toast.text}</T>
            </View>
          </AnimatedBubble>
          <AnimatedBubble pop={pop} scale>
            <Kettle key={toast.id} size={58} mood={toast.mood} band={band} skin={mascotSkin(state)} />
          </AnimatedBubble>
        </View>
      </Pressable>
    </View>
  );

  // On iOS, modals (like the workout screen) sit above the app, so draw over everything.
  return Platform.OS === 'ios' ? <FullWindowOverlay>{content}</FullWindowOverlay> : content;
}

function AnimatedBubble({ pop, scale, children }: { pop: ReturnType<typeof usePop>; scale?: boolean; children: React.ReactNode }) {
  return (
    <Animated.View
      style={{
        opacity: pop,
        transform: [
          { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [scale ? 0.4 : 0.85, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
