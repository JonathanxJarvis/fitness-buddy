import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ActionSheet, Badge, Button, Card, EmptyState, IconButton, Sheet, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { Ring } from '@/components/Ring';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { doneSets, findExercise, previousSets, routineFromWorkout, workoutCalories, workoutVolume } from '@/lib/training';
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
  onChange,
  onToggle,
  onRemove,
}: {
  index: number;
  set: WorkoutSet;
  prev?: WorkoutSet;
  units: UnitSystem;
  bodyweight?: boolean;
  onChange: (s: WorkoutSet) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const [w, setW] = useState(toDisplay(set.kg, units));
  const [r, setR] = useState(set.reps ? String(set.reps) : '');
  useEffect(() => setW(toDisplay(set.kg, units)), [units]); // eslint-disable-line react-hooks/exhaustive-deps

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
          style={[input, { flex: 1 }]}
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
        style={[input, { flex: 1 }]}
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
    router.replace({ pathname: '/workout-detail', params: { id: done.id, fresh: '1' } });
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

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {w.exercises.length === 0 && <EmptyState icon="barbell-outline" title="Add your first exercise" body="Pick from 60+ exercises or create your own." />}
        {w.exercises.map((e, ei) => {
          const x = findExercise(e.exerciseId, state.customExercises);
          const prev = previousSets(e.exerciseId, history);
          return (
            <FadeIn key={e.exerciseId + ei} delay={ei * 40}>
              <Card style={{ padding: spacing.md, marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <T weight="800" style={{ flex: 1 }} numberOfLines={1}>{x?.name ?? 'Exercise'}</T>
                  {x && <Badge label={x.muscle.toUpperCase()} color={nutrientColors.protein} />}
                  <IconButton label="Exercise options" icon="ellipsis-horizontal" color={colors.textMuted} size={20} onPress={() => setMenuFor(ei)} />
                </View>
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
                    onChange={(ns) => setSet(ei, si, ns)}
                    onToggle={() => toggle(ei, si)}
                    onRemove={() => update({ ...w, exercises: w.exercises.map((b, i) => (i === ei ? { ...b, sets: b.sets.filter((_, j) => j !== si) } : b)) })}
                  />
                ))}
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
          Check a set to start the {restSeconds}s rest timer. Long-press a set number to remove it.
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
            label: 'Move up',
            icon: 'arrow-up',
            onPress: () => {
              const i = menuFor ?? 0;
              if (i === 0) return;
              const list = [...w.exercises];
              [list[i - 1], list[i]] = [list[i], list[i - 1]];
              update({ ...w, exercises: list });
            },
          },
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
