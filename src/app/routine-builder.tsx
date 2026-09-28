import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button, IconButton, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { findExercise } from '@/lib/training';
import { SESSIONS } from '@/lib/plan';
import { takeDraft, usePendingDraft } from '@/lib/routineDraft';
import { font, radius, spacing, useTheme } from '@/theme';
import type { Routine } from '@/lib/types';

type Row = Routine['exercises'][number];

/** Quick names; picking one on an empty workout fills in a starting point you can change. */
const STARTERS = ['push', 'pull', 'legs', 'upper', 'lower', 'full'];

function Count({ value, onChange, min, max, label }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string }) {
  const { colors } = useTheme();
  const step = (d: number) => {
    const n = Math.min(max, Math.max(min, value + d));
    if (n !== value) {
      Haptics.selectionAsync().catch(() => {});
      onChange(n);
    }
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: radius.pill }}>
      <Pressable onPress={() => step(-1)} accessibilityLabel={`Fewer ${label}`} hitSlop={6} style={{ paddingHorizontal: 9, paddingVertical: 6 }}>
        <Ionicons name="remove" size={14} color={colors.textMuted} />
      </Pressable>
      <View style={{ alignItems: 'center', minWidth: 30 }}>
        <T size={15} weight="800">{value}</T>
        <T size={9} weight="700" muted style={{ marginTop: -2, letterSpacing: 0.6 }}>{label.toUpperCase()}</T>
      </View>
      <Pressable onPress={() => step(1)} accessibilityLabel={`More ${label}`} hitSlop={6} style={{ paddingHorizontal: 9, paddingVertical: 6 }}>
        <Ionicons name="add" size={14} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

/** Build or edit a saved workout (Push, Pull, …) before you ever train it. */
export default function RoutineBuilder() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, name: preset } = useLocalSearchParams<{ id?: string; name?: string }>();
  const existing = id ? state.routines.find((r) => r.id === id) : undefined;
  const starter = preset ? SESSIONS.find((s) => s.name.toLowerCase() === preset.toLowerCase()) : undefined;

  const [name, setName] = useState(existing?.name ?? starter?.name ?? '');
  const [rows, setRows] = useState<Row[]>(existing?.exercises ?? starter?.routine.exercises.map((x) => ({ ...x })) ?? []);
  const pending = usePendingDraft();

  // Exercises picked on the picker screen.
  useEffect(() => {
    if (!pending) return;
    const ids = takeDraft();
    setRows((r) => [...r, ...ids.map((exerciseId) => ({ exerciseId, sets: 3, reps: 10 }))]);
  }, [pending]);

  // Leftovers from an abandoned builder shouldn't leak into this one.
  useEffect(() => {
    takeDraft();
  }, []);

  const pickStarter = (sid: string) => {
    const s = SESSIONS.find((x) => x.id === sid)!;
    Haptics.selectionAsync().catch(() => {});
    setName(s.name);
    if (!rows.length) setRows(s.routine.exercises.map((x) => ({ ...x })));
  };
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const cleanName = name.trim();
  const clash = state.routines.some((r) => r.id !== existing?.id && r.name.trim().toLowerCase() === cleanName.toLowerCase());
  const canSave = !!cleanName && rows.length > 0 && !clash;
  const totalSets = rows.reduce((n, x) => n + x.sets, 0);

  const save = () => {
    if (!canSave) return;
    dispatch({ type: 'saveRoutine', routine: { id: existing?.id ?? uid(), name: cleanName, exercises: rows } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <T size={12} weight="800" muted style={{ letterSpacing: 1.2 }}>{existing ? 'EDIT WORKOUT' : 'NEW WORKOUT'}</T>
          <T size={22} weight="800">{cleanName || 'Build your workout'}</T>
        </View>
        <IconButton label="Close" icon="close" color={colors.text} onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 110 }} keyboardShouldPersistTaps="handled">
        <T size={13} weight="700" muted style={{ marginBottom: 6 }}>Name</T>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push, Pull, Heavy legs"
          placeholderTextColor={colors.textMuted}
          maxLength={28}
          style={{ backgroundColor: colors.cardAlt, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 17, ...font('700') }}
        />
        {clash && <T size={12} color={colors.danger} style={{ marginTop: 6 }}>You already have a workout called {cleanName}.</T>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm, marginHorizontal: -spacing.lg, flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.lg }}>
          {STARTERS.map((sid) => {
            const s = SESSIONS.find((x) => x.id === sid)!;
            const on = cleanName.toLowerCase() === s.name.toLowerCase();
            return (
              <PressScale key={sid} onPress={() => pickStarter(sid)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1.5, borderColor: on ? s.color : colors.border, backgroundColor: on ? s.color + '22' : 'transparent' }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.color }} />
                <T size={13} weight="800" color={on ? s.color : colors.text}>{s.name}</T>
              </PressScale>
            );
          })}
        </ScrollView>
        <T size={12} muted style={{ marginTop: 6 }}>
          Name it Push, Pull, Legs, Upper, Lower or Full body and it replaces that day in your training plan.
        </T>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xl, marginBottom: spacing.sm }}>
          <T size={17} weight="800" style={{ flex: 1 }}>Exercises</T>
          {rows.length > 0 && <T size={12} weight="700" muted>{rows.length} exercises · {totalSets} sets · ~{Math.round(totalSets * 2.8 + 5)} min</T>}
        </View>

        {rows.length === 0 ? (
          <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: 4 }}>
            <Ionicons name="barbell-outline" size={26} color={colors.textMuted} />
            <T weight="800">No exercises yet</T>
            <T size={13} muted center>Pick a starter above or add your own exercises. You can set sets and reps for each.</T>
          </View>
        ) : (
          rows.map((row, i) => {
            const ex = findExercise(row.exerciseId, state.customExercises);
            return (
              <FadeIn key={`${row.exerciseId}-${i}`} delay={Math.min(i, 6) * 30}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                  <View style={{ alignItems: 'center' }}>
                    <Pressable onPress={() => move(i, -1)} disabled={i === 0} accessibilityLabel="Move up" hitSlop={4}>
                      <Ionicons name="chevron-up" size={16} color={i === 0 ? colors.track : colors.textMuted} />
                    </Pressable>
                    <T size={11} weight="800" muted>{i + 1}</T>
                    <Pressable onPress={() => move(i, 1)} disabled={i === rows.length - 1} accessibilityLabel="Move down" hitSlop={4}>
                      <Ionicons name="chevron-down" size={16} color={i === rows.length - 1 ? colors.track : colors.textMuted} />
                    </Pressable>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T weight="800" numberOfLines={1}>{ex?.name ?? 'Exercise'}</T>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      <Count value={row.sets} onChange={(sets) => update(i, { sets })} min={1} max={10} label="sets" />
                      <Count value={row.reps} onChange={(reps) => update(i, { reps })} min={1} max={50} label="reps" />
                    </View>
                  </View>
                  <IconButton label={`Remove ${ex?.name ?? 'exercise'}`} icon="trash-outline" color={colors.textMuted} onPress={() => setRows((r) => r.filter((_, j) => j !== i))} />
                </View>
              </FadeIn>
            );
          })
        )}

        <Button title="Add exercises" icon="add" variant="secondary" onPress={() => router.push({ pathname: '/exercise-picker', params: { for: 'routine' } })} style={{ marginTop: spacing.md }} />
        {existing && (
          <Button
            title="Delete workout"
            variant="ghost"
            onPress={() => {
              dispatch({ type: 'deleteRoutine', id: existing.id });
              router.back();
            }}
            style={{ marginTop: spacing.sm }}
          />
        )}
      </ScrollView>

      <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: insets.bottom + spacing.md }}>
        <Button title={existing ? 'Save changes' : 'Save workout'} onPress={save} disabled={!canSave} />
      </View>
    </KeyboardAvoidingView>
  );
}
