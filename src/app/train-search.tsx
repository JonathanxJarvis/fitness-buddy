import React, { useMemo, useState } from 'react';
import { Pressable, SectionList, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, EmptyState, IconButton, T } from '@/components/ui';
import { PressScale } from '@/components/motion';
import { ExerciseFigure } from '@/components/exercise/ExerciseFigure';
import { useStore } from '@/store/StoreProvider';
import { useStartWorkout } from '@/lib/useStartWorkout';
import { EXERCISE_LIBRARY, findExercise } from '@/lib/training';
import { SESSIONS } from '@/lib/plan';
import { font, radius, spacing, useTheme } from '@/theme';
import type { Exercise, Routine } from '@/lib/types';

type WorkoutItem = { kind: 'workout'; routine: Routine; mine: boolean; color: string };
type ExerciseItem = { kind: 'exercise'; exercise: Exercise };
type Item = WorkoutItem | ExerciseItem | { kind: 'more'; count: number };

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const MINE = '#2BA89A';
/** Templates shown before you type or tap "more". */
const CLASSICS = 4;

/** One place to find anything to train: your workouts and templates first, exercises below. */
export default function TrainSearch() {
  const { state } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const start = useStartWorkout();
  const [query, setQuery] = useState('');
  const [allTemplates, setAllTemplates] = useState(false);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const exName = (id: string) => findExercise(id, state.customExercises)?.name.toLowerCase() ?? '';
    const hit = (r: Routine) => !q || r.name.toLowerCase().includes(q) || r.exercises.some((x) => exName(x.exerciseId).includes(q));
    const mineNames = new Set(state.routines.map((r) => r.name.trim().toLowerCase()));
    const workouts: WorkoutItem[] = [
      ...state.routines.map((r) => ({ kind: 'workout' as const, routine: r, mine: true, color: SESSIONS.find((s) => s.name.toLowerCase() === r.name.trim().toLowerCase())?.color ?? MINE })),
      ...SESSIONS.filter((s) => !mineNames.has(s.name.toLowerCase())).map((s) => ({ kind: 'workout' as const, routine: { ...s.routine, name: s.name }, mine: false, color: s.color })),
    ].filter((w) => hit(w.routine));
    // A calm first view: your own workouts and a few classics; searching shows everything.
    const few = !q && !allTemplates;
    let shown = 0;
    const visible = workouts.filter((w) => w.mine || !few || shown++ < CLASSICS);
    const hidden = workouts.length - visible.length;
    const exercises: ExerciseItem[] = [...state.customExercises, ...EXERCISE_LIBRARY]
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.muscle.includes(q) || e.equipment.includes(q))
      .map((exercise) => ({ kind: 'exercise' as const, exercise }));
    return [
      ...(visible.length ? [{ title: 'Workouts', data: [...visible, ...(hidden ? [{ kind: 'more' as const, count: hidden }] : [])] as Item[] }] : []),
      ...(exercises.length ? [{ title: 'Exercises', data: exercises as Item[] }] : []),
    ];
  }, [query, allTemplates, state.routines, state.customExercises]);

  const renderItem = ({ item }: { item: Item }) => {
    if (item.kind === 'more') {
      return (
        <Pressable onPress={() => setAllTemplates(true)} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: spacing.sm, opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
          <T size={14} weight="800" color={colors.primary}>Show {item.count} more templates</T>
        </Pressable>
      );
    }
    if (item.kind === 'exercise') {
      const e = item.exercise;
      return (
        <Pressable
          onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${e.name}, view`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: spacing.sm, borderRadius: 14, backgroundColor: pressed ? colors.cardAlt : 'transparent' })}
        >
          <View style={{ borderRadius: 13, backgroundColor: colors.cardAlt, padding: 3 }}>
            <ExerciseFigure exerciseId={e.id} customExercises={state.customExercises} size={44} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T weight="700" numberOfLines={1}>{e.name}</T>
            <T size={12} muted numberOfLines={1}>{cap(e.muscle)} · {cap(e.equipment)}</T>
          </View>
          <T size={13} weight="700" color={colors.primary}>View</T>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      );
    }
    const r = item.routine;
    const sets = r.exercises.reduce((n, x) => n + x.sets, 0);
    const names = r.exercises.map((x) => findExercise(x.exerciseId, state.customExercises)?.name).filter(Boolean).join(', ');
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: spacing.sm }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: item.color + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={item.mine ? 'barbell' : 'albums-outline'} size={20} color={item.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T weight="800" numberOfLines={1} style={{ flexShrink: 1 }}>{r.name}</T>
            {!item.mine ? <T size={11} weight="700" muted>Template</T> : null}
          </View>
          <T size={12} muted numberOfLines={1}>{r.exercises.length} exercises · ~{Math.round(sets * 2.8 + 5)} min · {names}</T>
        </View>
        {item.mine ? (
          <IconButton label={`Edit ${r.name}`} icon="create-outline" color={colors.textMuted} onPress={() => router.push({ pathname: '/routine-builder', params: { id: r.id } })} />
        ) : null}
        <PressScale
          onPress={() => start(r)}
          accessibilityRole="button"
          accessibilityLabel={`Start ${r.name}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8 }}
        >
          <Ionicons name="play" size={13} color={colors.primary} />
          <T size={13} weight="800" color={colors.primary}>Start</T>
        </PressScale>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
        <IconButton label="Back" icon="chevron-back" color={colors.text} onPress={() => router.back()} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 14 }}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Search workouts and exercises"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, paddingVertical: 11, color: colors.text, fontSize: 16, ...font('500') }}
          />
          {query ? <IconButton label="Clear search" icon="close-circle" size={18} color={colors.textMuted} onPress={() => setQuery('')} /> : null}
        </View>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(i) => (i.kind === 'more' ? 'more' : i.kind === 'exercise' ? 'e:' + i.exercise.id : 'w:' + i.routine.id + (i.mine ? ':m' : ''))}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={{ backgroundColor: colors.background, paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: 4 }}>
            <T size={12} weight="800" muted style={{ letterSpacing: 1 }}>{section.title.toUpperCase()}</T>
          </View>
        )}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: spacing.sm + 2, paddingBottom: insets.bottom + spacing.xl }}
        ListEmptyComponent={
          <View>
            <EmptyState icon="search" title="Nothing found" body="Try another word, or build your own workout." />
            <Button title="Create a workout" icon="add" variant="secondary" onPress={() => router.push('/routine-builder')} />
          </View>
        }
        ListFooterComponent={
          sections.length ? (
            <Pressable onPress={() => router.push('/routine-builder')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.lg }}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <T weight="800" color={colors.primary}>Create your own workout</T>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}
