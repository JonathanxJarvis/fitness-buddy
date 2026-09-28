import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Pet, type Mood } from './Mascot';
import { T } from './ui';
import { nativeDriver } from './motion';
import { tabBarHeight } from './TabBar';
import { usePetLook } from './pet/usePetLook';
import { useStore } from '@/store/StoreProvider';
import { mascotLine, type MascotEvent } from '@/lib/mascotLines';
import { stateProgression } from '@/lib/progression';
import { doneSets, prExercises } from '@/lib/training';
import { itemNutrients } from '@/lib/nutrition';
import { todayKey } from '@/lib/dates';
import { useTheme } from '@/theme';

interface Toast {
  id: number;
  text: string;
  mood: Mood;
  ms: number;
}

const PRIORITY: Record<MascotEvent, number> = { rankUp: 5, levelUp: 4, chest: 3, quest: 3, pr: 3, proteinHit: 2, workoutDone: 2, workoutStart: 2, meal: 1, water: 1, setDone: 0, streak: 1, hello: 0 };
const TAB_ROUTES = ['/', '/train', '/crew', '/coach'];

/**
 * Watches the app state and has your pet hop up from the bottom of the screen
 * when something worth cheering happens: a workout starts or ends, a PR, a
 * rank-up, a meal logged. Tap it or swipe it down to dismiss.
 */
export function MascotToast() {
  const { state, ready } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const look = usePetLook();
  const [toast, setToast] = useState<Toast | null>(null);
  const prev = useRef<null | { active: string | null; workouts: number; entries: number; sets: number; protein: number; water: number; level: number; stage: number; quests: number }>(null);
  const enabled = state.settings.mascot !== false;

  const prog = useMemo(
    () => (state.profile ? stateProgression(state, todayKey()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.workouts, state.profile, state.exercises, state.questLog],
  );
  const today = todayKey();
  const protein = useMemo(() => state.entries.filter((e) => e.date === today).reduce((s, e) => s + itemNutrients(e).protein, 0), [state.entries, today]);

  const show = (event: MascotEvent, vars: Record<string, string | number> = {}) => {
    const line = mascotLine(event, { name: state.profile?.name?.split(' ')[0] ?? 'champ', rank: prog?.stage.label ?? 'Rookie', level: prog?.level ?? 1, ...vars });
    setToast({ id: Date.now(), ...line, ms: event === 'rankUp' || event === 'levelUp' ? 4400 : 3200 });
    if (event !== 'setDone') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
      quests: state.questLog?.length ?? 0,
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
    if (now.quests > p.quests) {
      const last = state.questLog![state.questLog!.length - 1];
      // Chests get their own full-screen opening, so only quests pop up here.
      if (last.id.startsWith('q:') || last.id === 'week') events.push(['quest', {}]);
    }
    if (!events.length) return;
    events.sort((a, b) => PRIORITY[b[0]] - PRIORITY[a[0]]);
    show(...events[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.activeWorkout, state.workouts, state.entries, state.water, state.questLog, protein, prog]);

  if (!toast) return null;

  const onTabs = TAB_ROUTES.includes(pathname);
  const bottom = onTabs ? tabBarHeight(insets.bottom) + 10 : insets.bottom + 14;
  const content = (
    <PopUp key="toast" toast={toast} bottom={bottom} bubble={colors.ink} onBubble={colors.onInk} disc={colors.card} ring={colors.border} onGone={() => setToast(null)}>
      <Pet species={look.species} size={66} mood={toast.mood} skin={look.skin} tier={look.tier} aura={look.aura} care={look.care} />
    </PopUp>
  );

  // On iOS, modals (like the workout screen) sit above the app, so draw over everything.
  return Platform.OS === 'ios' ? <FullWindowOverlay>{content}</FullWindowOverlay> : content;
}

/**
 * The pet hops up from below with a springy landing, its speech bubble pops
 * out a beat later, and on the way out everything sinks, shrinks and fades.
 */
function PopUp({ toast, bottom, bubble, onBubble, disc, ring, onGone, children }: { toast: Toast; bottom: number; bubble: string; onBubble: string; disc: string; ring: string; onGone: () => void; children: React.ReactNode }) {
  const pet = useRef(new Animated.Value(0)).current;
  const talk = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const leaving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    if (timer.current) clearTimeout(timer.current);
    Animated.parallel([
      Animated.timing(out, { toValue: 1, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: nativeDriver }),
      Animated.timing(talk, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: nativeDriver }),
    ]).start(() => onGone());
  };
  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  // Every new line: pop in again (the pet re-hops if it was already up).
  useEffect(() => {
    leaving.current = false;
    out.setValue(0);
    drag.setValue(0);
    talk.setValue(0);
    Animated.sequence([
      Animated.spring(pet, { toValue: 1, friction: 5.5, tension: 120, useNativeDriver: nativeDriver }),
    ]).start();
    Animated.sequence([Animated.delay(110), Animated.spring(talk, { toValue: 1, friction: 6, tension: 140, useNativeDriver: nativeDriver })]).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => leaveRef.current(), toast.ms);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast.id, toast.ms, pet, talk, out, drag]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => drag.setValue(Math.max(-12, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 28 || g.vy > 0.5) leaveRef.current();
          else Animated.spring(drag, { toValue: 0, friction: 6, useNativeDriver: nativeDriver }).start();
        },
      }),
    [drag],
  );

  const sink = out.interpolate({ inputRange: [0, 1], outputRange: [0, 90] });
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom, paddingHorizontal: 12 }}>
      <Animated.View
        {...pan.panHandlers}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          alignSelf: 'flex-start',
          opacity: out.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.4, 0] }),
          transform: [{ translateY: Animated.add(drag, sink) }, { scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) }],
        }}
      >
        <Pressable onPress={() => leaveRef.current()} accessibilityRole="alert" accessibilityLabel={toast.text} accessibilityHint="Tap to dismiss" style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Animated.View
            style={{
              opacity: pet.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
              transform: [
                { translateY: pet.interpolate({ inputRange: [0, 1], outputRange: [110, 0] }) },
                { scaleX: pet.interpolate({ inputRange: [0, 0.8, 1, 1.1], outputRange: [0.8, 0.95, 1, 1.06] }) },
                { scaleY: pet.interpolate({ inputRange: [0, 0.8, 1, 1.1], outputRange: [1.15, 1.04, 1, 0.94] }) },
              ],
            }}
          >
            {/* A little pedestal so the pet reads on any background. */}
            <View style={{ position: 'absolute', left: 5, right: 5, bottom: 2, height: 56, borderRadius: 28, backgroundColor: disc, borderWidth: 1, borderColor: ring, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5 }} />
            {children}
          </Animated.View>
          <Animated.View
            style={{
              marginLeft: -2,
              marginBottom: 30,
              opacity: talk,
              transform: [
                { translateX: talk.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) },
                { translateY: talk.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
                { scale: talk.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
            }}
          >
            <View style={{ backgroundColor: bubble, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomLeftRadius: 5, maxWidth: 240, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
              <T size={14} weight="700" color={onBubble}>{toast.text}</T>
            </View>
            {/* tail pointing at the pet */}
            <View style={{ position: 'absolute', left: -5, bottom: 4, width: 12, height: 12, backgroundColor: bubble, transform: [{ rotate: '45deg' }], borderRadius: 2 }} />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
