import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ActionSheet, Button, Card, EmptyState, IconButton, Sheet, T } from '@/components/ui';
import { ExerciseFigure } from '@/components/exercise/ExerciseFigure';
import { FadeIn, PressScale } from '@/components/motion';
import { Ring } from '@/components/Ring';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { doneSets, findExercise, previousSets, routineFromWorkout, workoutCalories, workoutVolume } from '@/lib/training';
import { suggestNext, type Suggestion } from '@/lib/progression-suggest';
import { isPro } from '@/lib/pro';
import { ProMark } from '@/components/ProMark';
import { DragHandle, DragList, moveItem, useDragScroll } from '@/components/DragList';
import { kgToLb, lbToKg, weightUnit } from '@/lib/units';
import { font, nutrientColors, radius, spacing, useTheme } from '@/theme';
import type { UnitSystem, Workout, WorkoutSet } from '@/lib/types';

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? h + ':' : ''}${h ? String(m).padStart(2, '0') : m}:${String(sec).padStart(2, '0')}`;
}

const toDisplay = (kg: number, units: UnitSystem) => (kg ? String(+(units === 'us' ? kgToLb(kg) : kg).toFixed(1)) : '');
const fromDisplay = (v: string, units: UnitSystem) => {
  const n = parseFloat(v.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 0;
  return units === 'us' ? lbToKg(n) : n;
};

function SetRow({
  index,
  set,
  prev,
  units,
  bodyweight,
  hint,
  quiet,
  onChange,
  onToggle,
  onRemove,
  onHint,
}: {
  index: number;
  set: WorkoutSet;
  prev?: WorkoutSet;
  units: UnitSystem;
  bodyweight?: boolean;
  onChange: (s: WorkoutSet) => void;
  onToggle: () => void;
  onRemove: () => void;
  /** Smart progression target for this set (Pro). */
  hint?: { kg: number; reps: number };
  onHint?: () => void;
  /** Hide the hint when the set already holds it (shown once per exercise, not on every row). */
  quiet?: boolean;
}) {
  const { colors } = useTheme();
  const [w, setW] = useState(toDisplay(set.kg, units));
  const [r, setR] = useState(set.reps ? String(set.reps) : '');
  useEffect(() => setW(toDisplay(set.kg, units)), [units]); // eslint-disable-line react-hooks/exhaustive-deps
  // Filled from outside (a suggestion tapped in): show the new numbers, but never fight your typing.
  useEffect(() => {
    if (Math.abs(fromDisplay(w, units) - set.kg) > 0.01) setW(toDisplay(set.kg, units));
  }, [set.kg]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if ((parseInt(r, 10) || 0) !== set.reps) setR(set.reps ? String(set.reps) : '');
  }, [set.reps]); // eslint-disable-line react-hooks/exhaustive-deps
  const matches = !!hint && Math.abs(hint.kg - set.kg) < 0.01 && hint.reps === set.reps;

  const input = {
    backgroundColor: set.done ? 'transparent' : colors.cardAlt,
    borderRadius: 10,
    paddingVertical: 7,
    textAlign: 'center' as const,
    color: colors.text,
    fontSize: 15,
    ...font('700'),
  };
  return (
    <View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 6, marginHorizontal: -6, borderRadius: 12, backgroundColor: set.done ? nutrientColors.calories + '1C' : 'transparent' }}>
      <Pressable onLongPress={onRemove} style={{ width: 26 }} accessibilityLabel={`Set ${index + 1}, long-press to remove`}>
        <T size={13} weight="800" muted center>{index + 1}</T>
      </Pressable>
      <T size={12} muted numberOfLines={1} style={{ flex: 1.3 }}>
        {prev ? (bodyweight || !prev.kg ? `${prev.reps} reps` : `${toDisplay(prev.kg, units)} × ${prev.reps}`) : '—'}
      </T>
      {!bodyweight && (
        <TextInput
          value={w}
          onChangeText={(t) => {
            setW(t);
            onChange({ ...set, kg: fromDisplay(t, units) });
          }}
          placeholder={prev?.kg ? toDisplay(prev.kg, units) : '0'}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={[input, { flex: 1, minWidth: 0 }]}
          accessibilityLabel={`Set ${index + 1} weight`}
        />
      )}
      <TextInput
        value={r}
        onChangeText={(t) => {
          setR(t);
          onChange({ ...set, reps: Math.max(0, parseInt(t, 10) || 0) });
        }}
        placeholder={prev ? String(prev.reps) : '0'}
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        style={[input, { flex: 1, minWidth: 0 }]}
        accessibilityLabel={`Set ${index + 1} reps`}
      />
      <PressScale
        accessibilityLabel={set.done ? `Undo set ${index + 1}` : `Complete set ${index + 1}`}
        onPress={onToggle}
        style={{ width: 34, height: 30, borderRadius: 9, backgroundColor: set.done ? nutrientColors.calories : colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="checkmark" size={18} color={set.done ? '#fff' : colors.textMuted} />
      </PressScale>
    </View>
    {hint && !set.done && !(matches && quiet) ? (
      <Pressable
        onPress={onHint}
        accessibilityRole="button"
        accessibilityLabel={`Suggested for set ${index + 1}: ${bodyweight || !hint.kg ? '' : `${toDisplay(hint.kg, units)} ${weightUnit(units)} for `}${hint.reps} reps${matches ? '' : ', tap to fill in'}`}
        hitSlop={4}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 34, marginTop: -1, marginBottom: 3, alignSelf: 'flex-start', opacity: pressed ? 0.55 : 1 })}
      >
        <ProMark size={9} />
        <T size={11} weight="700" color={matches ? colors.textMuted : colors.primary}>
          {matches ? 'Suggested' : 'Try'} {bodyweight || !hint.kg ? `${hint.reps} reps` : `${toDisplay(hint.kg, units)} ${weightUnit(units)} × ${hint.reps}`}
        </T>
        <Ionicons name={matches ? 'information-circle-outline' : 'arrow-up-circle-outline'} size={12} color={matches ? colors.textMuted : colors.primary} />
      </Pressable>
    ) : null}
    </View>
  );
}

const KIND_LABEL: Record<Suggestion['kind'], string> = { increase: 'Level up', repeat: 'Same again', deload: 'Small deload' };

/** Why the suggestion is what it is, shown under an exercise's sets. */
function WhyNote({ s, onClose }: { s: Suggestion; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <FadeIn offset={6}>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, padding: 10, borderRadius: 12, backgroundColor: colors.primarySoft }}>
        <ProMark size={11} style={{ marginTop: 3 }} />
        <View style={{ flex: 1 }}>
          <T size={12} weight="800" color={colors.primary}>Smart progression · {KIND_LABEL[s.kind]}</T>
          <T size={12} style={{ marginTop: 2, lineHeight: 17 }}>{s.reason}</T>
        </View>
        <Pressable onPress={onClose} accessibilityLabel="Hide reason" hitSlop={8}>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </FadeIn>
  );
}

/** Free users: the suggestion row, locked. */
function LockedHint() {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/pro', params: { feature: 'progression' } })}
      accessibilityRole="button"
      accessibilityLabel="Smart progression, a Pro feature: see what to lift next"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.cardAlt, opacity: pressed ? 0.6 : 1 })}
    >
      <ProMark size={10} />
      <T size={12} weight="700" muted style={{ flex: 1 }}>See what to lift next from your last sessions</T>
      <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
    </Pressable>
  );
}

function RestBar({ endsAt, total, onAdjust, onSkip }: { endsAt: number; total: number; onAdjust: (s: number) => void; onSkip: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = endsAt - now;
  return (
    <FadeIn offset={30} style={{ position: 'absolute', left: spacing.md, right: spacing.md, bottom: insets.bottom + spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.ink, borderRadius: 22, padding: 10, paddingRight: 12 }}>
        <Ring size={46} stroke={4} progress={Math.max(0, left) / (total * 1000)} color={nutrientColors.calories} trackColor="rgba(127,127,127,0.3)">
          <Ionicons name="timer-outline" size={18} color={colors.onInk} />
        </Ring>
        <View style={{ flex: 1 }}>
          <T size={11} weight="700" color={colors.onInk} style={{ opacity: 0.7 }}>REST</T>
          <T size={22} weight="800" color={colors.onInk}>{clock(left)}</T>
        </View>
        {[-15, 15].map((d) => (
          <Pressable key={d} onPress={() => onAdjust(d)} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(127,127,127,0.25)' }}>
            <T size={13} weight="800" color={colors.onInk}>{d > 0 ? '+15' : '−15'}</T>
          </Pressable>
        ))}
        <Pressable onPress={onSkip} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: nutrientColors.calories }}>
          <T size={13} weight="800" color="#fff">Skip</T>
        </Pressable>
      </View>
    </FadeIn>
  );
}

export default function WorkoutScreen() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const units = state.settings.units;
  const w = state.activeWorkout;
  const [now, setNow] = useState(Date.now());
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [saveRoutine, setSaveRoutine] = useState(false);
  const [why, setWhy] = useState<number | null>(null);
  const [reorder, setReorder] = useState<string[] | null>(null);
  const { scrollProps, dragScroll } = useDragScroll();
  const pro = isPro(state);
  const restTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restSeconds = state.restSeconds ?? 90;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => {
    if (restTimeout.current) clearTimeout(restTimeout.current);
  }, []);

  const history = useMemo(() => state.workouts.filter((x) => x.id !== w?.id), [state.workouts, w?.id]);
  // One suggestion per exercise, from your earlier sessions (not this one).
  const shape = w?.exercises.map((e) => `${e.exerciseId}:${e.targetReps ?? ''}:${e.sets.length}`).join('|');
  const suggestions = useMemo(
    () => (w?.exercises ?? []).map((e) => suggestNext(e.exerciseId, history, { targetReps: e.targetReps, sets: e.sets.length, custom: state.customExercises, units })),
    [shape, history, state.customExercises, units], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!w) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, padding: spacing.lg }}>
        <EmptyState icon="barbell-outline" title="No workout in progress" body="Start one from the Train tab." />
        <Button title="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const update = (next: Workout) => dispatch({ type: 'setActiveWorkout', workout: next });
  const setSet = (ei: number, si: number, s: WorkoutSet) =>
    update({ ...w, exercises: w.exercises.map((e, i) => (i === ei ? { ...e, sets: e.sets.map((x, j) => (j === si ? s : x)) } : e)) });

  const startRest = (seconds: number, endsAt = Date.now() + seconds * 1000) => {
    if (restTimeout.current) clearTimeout(restTimeout.current);
    setRest({ endsAt, total: seconds });
    restTimeout.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setRest(null);
    }, Math.max(0, endsAt - Date.now()));
  };

  const toggle = (ei: number, si: number) => {
    const s = w.exercises[ei].sets[si];
    const prev = previousSets(w.exercises[ei].exerciseId, history)[si];
    // An empty row takes last time's numbers when checked off.
    const filled = { ...s, kg: s.kg || prev?.kg || 0, reps: s.reps || prev?.reps || 0 };
    setSet(ei, si, { ...filled, done: !s.done });
    if (!s.done) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      startRest(restSeconds);
    }
  };

  const finish = () => {
    const done: Workout = {
      ...w,
      endedAt: Date.now(),
      // Keep only completed sets; drop exercises with none.
      exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length),
    };
    done.calories = workoutCalories(done, state.profile?.weightKg ?? 75);
    dispatch({ type: 'finishWorkout', workout: done });
    if (saveRoutine && done.exercises.length) dispatch({ type: 'saveRoutine', routine: routineFromWorkout(done, uid()) });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setFinishOpen(false);
    router.replace({ pathname: '/workout-summary', params: { id: done.id } });
  };

  const volume = workoutVolume(w);
  const volumeShown = units === 'us' ? kgToLb(volume) : volume;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconButton label="Minimize workout" icon="chevron-down" color={colors.text} onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <TextInput
            value={w.name}
            onChangeText={(name) => update({ ...w, name })}
            style={{ color: colors.text, fontSize: 18, ...font('800'), padding: 0 }}
            accessibilityLabel="Workout name"
          />
          <T size={12} muted>
            {clock(now - w.startedAt)} · {doneSets(w)} sets · {Math.round(volumeShown).toLocaleString()} {weightUnit(units)}
          </T>
        </View>
        <PressScale onPress={() => setFinishOpen(true)} style={{ backgroundColor: nutrientColors.calories, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill }}>
          <T size={14} weight="800" color="#fff">Finish</T>
        </PressScale>
      </View>

      <ScrollView {...scrollProps} contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {w.exercises.length === 0 && <EmptyState icon="barbell-outline" title="Add your first exercise" body="Pick from 60+ exercises or create your own." />}
        {reorder ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm }}>
              <T size={13} muted style={{ flex: 1 }}>Drag the grip to change the order.</T>
              <PressScale onPress={() => setReorder(null)} accessibilityRole="button" style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill }}>
                <T size={14} weight="800" color={colors.onPrimary}>Done</T>
              </PressScale>
            </View>
            <DragList
              data={w.exercises.map((e, i) => ({ e, k: reorder[i] ?? `x${i}` }))}
              keyOf={(x) => x.k}
              scroll={dragScroll}
              labelOf={(x) => findExercise(x.e.exerciseId, state.customExercises)?.name ?? 'exercise'}
              onReorder={(from, to) => {
                setReorder((k) => (k ? moveItem(k, from, to) : k));
                update({ ...w, exercises: moveItem(w.exercises, from, to) });
              }}
              renderItem={({ e }, { active, handle }) => {
                const x = findExercise(e.exerciseId, state.customExercises);
                const done = e.sets.filter((s) => s.done).length;
                return (
                  <Card style={{ padding: 10, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: active ? 1.5 : 0, borderColor: colors.primary }}>
                    <View style={{ borderRadius: 12, backgroundColor: colors.cardAlt, padding: 2 }}>
                      <ExerciseFigure exerciseId={e.exerciseId} customExercises={state.customExercises} size={40} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T weight="800" numberOfLines={1}>{x?.name ?? 'Exercise'}</T>
                      <T size={12} muted>{e.sets.length} sets{done ? ` · ${done} done` : ''}</T>
                    </View>
                    <DragHandle handle={handle} active={active} />
                  </Card>
                );
              }}
            />
          </>
        ) : w.exercises.map((e, ei) => {
          const x = findExercise(e.exerciseId, state.customExercises);
          const prev = previousSets(e.exerciseId, history);
          return (
            <FadeIn key={e.exerciseId + ei} delay={ei * 40}>
              <Card style={{ padding: spacing.md, marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.exerciseId } })}
                    accessibilityRole="button"
                    accessibilityLabel={`About ${x?.name ?? 'this exercise'}`}
                    onLongPress={() => {
                      if (w.exercises.length < 2) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      setReorder(w.exercises.map((_, i) => `x${i}`));
                    }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}
                  >
                    <View style={{ borderRadius: 12, backgroundColor: colors.cardAlt, padding: 2 }}>
                      <ExerciseFigure exerciseId={e.exerciseId} customExercises={state.customExercises} size={40} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T weight="800" numberOfLines={1}>{x?.name ?? 'Exercise'}</T>
                      {x && <T size={12} weight="700" color={nutrientColors.protein}>{x.muscle[0].toUpperCase() + x.muscle.slice(1)}</T>}
                    </View>
                  </Pressable>
                  <IconButton label="Exercise options" icon="ellipsis-horizontal" color={colors.textMuted} size={20} onPress={() => setMenuFor(ei)} />
                </View>
                {!pro && suggestions[ei] ? <LockedHint /> : null}
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 0, marginBottom: 2 }}>
                  <T size={10} weight="800" muted center style={{ width: 26 }}>SET</T>
                  <T size={10} weight="800" muted style={{ flex: 1.3 }}>PREVIOUS</T>
                  {!x?.bodyweight && <T size={10} weight="800" muted center style={{ flex: 1 }}>{weightUnit(units).toUpperCase()}</T>}
                  <T size={10} weight="800" muted center style={{ flex: 1 }}>REPS</T>
                  <View style={{ width: 34 }} />
                </View>
                {e.sets.map((s, si) => (
                  <SetRow
                    key={si}
                    index={si}
                    set={s}
                    prev={prev[si]}
                    units={units}
                    bodyweight={x?.bodyweight}
                    hint={pro ? suggestions[ei]?.sets[si] : undefined}
                    quiet={si !== e.sets.findIndex((x) => !x.done)}
                    onHint={() => {
                      const h = suggestions[ei]?.sets[si];
                      if (!h) return;
                      Haptics.selectionAsync().catch(() => {});
                      if (Math.abs(h.kg - s.kg) > 0.01 || h.reps !== s.reps) setSet(ei, si, { ...s, kg: h.kg, reps: h.reps });
                      setWhy(ei);
                    }}
                    onChange={(ns) => setSet(ei, si, ns)}
                    onToggle={() => toggle(ei, si)}
                    onRemove={() => update({ ...w, exercises: w.exercises.map((b, i) => (i === ei ? { ...b, sets: b.sets.filter((_, j) => j !== si) } : b)) })}
                  />
                ))}
                {pro && why === ei && suggestions[ei] ? <WhyNote s={suggestions[ei]!} onClose={() => setWhy(null)} /> : null}
                <Pressable
                  onPress={() => {
                    const last = e.sets[e.sets.length - 1];
                    update({ ...w, exercises: w.exercises.map((b, i) => (i === ei ? { ...b, sets: [...b.sets, { reps: last?.reps ?? 10, kg: last?.kg ?? 0, done: false }] } : b)) });
                  }}
                  style={{ marginTop: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.cardAlt, alignItems: 'center' }}
                >
                  <T size={13} weight="700">+ Add set</T>
                </Pressable>
              </Card>
            </FadeIn>
          );
        })}
        <Button title="Add exercise" icon="add" variant="secondary" onPress={() => router.push('/exercise-picker')} style={{ marginTop: spacing.sm }} />
        <T size={12} muted center style={{ marginTop: spacing.md }}>
          Check a set to start the {restSeconds}s rest timer. Long-press a set number to remove it, or an exercise name to reorder.
        </T>
      </ScrollView>

      {rest && (
        <RestBar
          endsAt={rest.endsAt}
          total={rest.total}
          onAdjust={(d) => startRest(rest.total + d, rest.endsAt + d * 1000)}
          onSkip={() => {
            if (restTimeout.current) clearTimeout(restTimeout.current);
            setRest(null);
          }}
        />
      )}

      <ActionSheet
        visible={menuFor !== null}
        onClose={() => setMenuFor(null)}
        title={menuFor !== null ? findExercise(w.exercises[menuFor]?.exerciseId ?? '', state.customExercises)?.name : undefined}
        actions={[
          {
            label: 'About this exercise',
            icon: 'information-circle-outline',
            onPress: () => {
              const e = menuFor !== null ? w.exercises[menuFor] : undefined;
              if (e) router.push({ pathname: '/exercise/[id]', params: { id: e.exerciseId } });
            },
          },
          ...(w.exercises.length > 1
            ? [{ label: 'Reorder exercises', icon: 'reorder-three' as const, subtitle: 'Drag them into the order you want', onPress: () => setReorder(w.exercises.map((_, i) => `x${i}`)) }]
            : []),
          { label: 'Remove exercise', icon: 'trash-outline', destructive: true, onPress: () => update({ ...w, exercises: w.exercises.filter((_, i) => i !== menuFor) }) },
        ]}
      />

      <Sheet visible={finishOpen} onClose={() => setFinishOpen(false)} title="Finish workout?">
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          {[
            ['Time', clock(now - w.startedAt)],
            ['Sets', String(doneSets(w))],
            ['Volume', `${Math.round(volumeShown).toLocaleString()} ${weightUnit(units)}`],
          ].map(([l, v]) => (
            <View key={l} style={{ flex: 1, backgroundColor: colors.cardAlt, borderRadius: 14, padding: 10 }}>
              <T size={11} muted weight="700">{l}</T>
              <T weight="800">{v}</T>
            </View>
          ))}
        </View>
        <Pressable onPress={() => setSaveRoutine((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, marginBottom: spacing.sm }}>
          <Ionicons name={saveRoutine ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
          <T weight="600">Save as a routine to repeat later</T>
        </Pressable>
        <Button title="Finish & save" icon="checkmark" onPress={finish} disabled={doneSets(w) === 0} />
        {doneSets(w) === 0 && <T size={12} muted center style={{ marginTop: 6 }}>Check off at least one set to save.</T>}
        <Button
          title="Discard workout"
          variant="ghost"
          style={{ marginTop: spacing.sm }}
          onPress={() => {
            setFinishOpen(false);
            dispatch({ type: 'setActiveWorkout', workout: null });
            router.back();
          }}
        />
      </Sheet>
    </View>
  );
}
