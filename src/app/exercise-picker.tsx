import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button, Chip, EmptyState, Field, IconButton, Sheet, T } from '@/components/ui';
import { ExerciseFigure } from '@/components/exercise/ExerciseFigure';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { addToDraft } from '@/lib/routineDraft';
import { useStartWithExercises } from '@/lib/useStartWorkout';
import { EXERCISE_LIBRARY, MUSCLES, newBlock, personalRecords } from '@/lib/training';
import { formatWeight } from '@/lib/units';
import { font, radius, spacing, useTheme } from '@/theme';
import type { Equipment, Exercise, Muscle } from '@/lib/types';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell'];

export default function ExercisePicker() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  /**
   * Where the picks go: "routine" for the routine builder, "new" to start a
   * workout with them, otherwise the running workout.
   */
  const { for: target } = useLocalSearchParams<{ for?: string }>();
  const startWith = useStartWithExercises();
  const starting = target === 'new';
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all');
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<Muscle>('chest');
  const [newEquipment, setNewEquipment] = useState<Equipment>('dumbbell');

  const prs = useMemo(() => personalRecords(state.workouts), [state.workouts]);
  const usage = useMemo(() => {
    const n: Record<string, number> = {};
    for (const w of state.workouts) for (const e of w.exercises) n[e.exerciseId] = (n[e.exerciseId] ?? 0) + 1;
    return n;
  }, [state.workouts]);

  const all = useMemo(() => [...state.customExercises, ...EXERCISE_LIBRARY], [state.customExercises]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((e) => (muscle === 'all' || e.muscle === muscle) && (!q || e.name.toLowerCase().includes(q) || e.equipment.includes(q)))
      .sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0));
  }, [all, query, muscle, usage]);

  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const add = () => {
    if (starting) {
      startWith(picked);
      return;
    }
    if (target === 'routine') {
      addToDraft(picked);
      router.back();
      return;
    }
    const w = state.activeWorkout;
    if (w) dispatch({ type: 'setActiveWorkout', workout: { ...w, exercises: [...w.exercises, ...picked.map((id) => newBlock(id, state.workouts))] } });
    router.back();
  };

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    const exercise: Exercise = { id: 'custom-' + uid(), name, muscle: newMuscle, equipment: newEquipment, bodyweight: newEquipment === 'bodyweight' || undefined };
    dispatch({ type: 'saveCustomExercise', exercise });
    setPicked((p) => [...p, exercise.id]);
    setCreating(false);
    setNewName('');
  };

  const renderItem = ({ item }: { item: Exercise }) => {
    const order = picked.indexOf(item.id);
    const on = order >= 0;
    const pr = prs[item.id];
    return (
      <Pressable
        onPress={() => toggle(item.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityLabel={item.name}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: spacing.sm, borderRadius: 16, backgroundColor: on ? colors.primarySoft : 'transparent' }}
      >
        <View style={{ borderRadius: 13, backgroundColor: on ? colors.card : colors.cardAlt, padding: 3 }}>
          <ExerciseFigure exerciseId={item.id} customExercises={state.customExercises} size={44} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T weight="700" numberOfLines={1}>{item.name}</T>
          <T size={12} muted numberOfLines={1}>
            {cap(item.muscle)} · {cap(item.equipment)}
            {pr ? ` · best ${item.bodyweight || !pr.kg ? `${pr.reps} reps` : formatWeight(pr.kg, state.settings.units, 0) + ' × ' + pr.reps}` : ''}
          </T>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item.id } })}
          accessibilityRole="button"
          accessibilityLabel={`About ${item.name}`}
          hitSlop={8}
          style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.5 : 1 })}
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.textMuted} />
        </Pressable>
        <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.primary : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: colors.border }}>
          {on ? <T size={13} weight="800" color={colors.onPrimary}>{order + 1}</T> : <Ionicons name="add" size={18} color={colors.textMuted} />}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <T size={20} weight="800">{starting ? 'Choose your exercises' : 'Add exercises'}</T>
          {starting ? <T size={13} muted>Pick what you'll train. You can add more during the workout.</T> : null}
        </View>
        <IconButton label="New custom exercise" icon="create-outline" color={colors.primary} onPress={() => setCreating(true)} />
        <IconButton label={starting ? 'Cancel' : 'Close'} icon="close" color={colors.text} onPress={() => router.back()} />
      </View>
      <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 14 }}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search 60+ exercises"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, paddingVertical: 10, color: colors.text, fontSize: 15, ...font('500') }}
          autoCorrect={false}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }} style={{ flexGrow: 0, flexShrink: 0 }}>
        {MUSCLES.map((m) => (
          <Chip key={m.key} label={m.label} active={muscle === m.key} onPress={() => setMuscle(m.key)} />
        ))}
      </ScrollView>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.sm + 2, paddingBottom: insets.bottom + spacing.xl }}
        ListEmptyComponent={<EmptyState icon="search" title="No match" body="Create it as a custom exercise with the pencil button." />}
      />
      {(picked.length > 0 || starting) && (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }}>
          {starting ? (
            <Button
              title={picked.length ? `Start workout · ${picked.length} exercise${picked.length > 1 ? 's' : ''}` : 'Pick at least one exercise'}
              icon={picked.length ? 'play' : undefined}
              onPress={add}
              disabled={!picked.length}
            />
          ) : (
            <Button title={`Add ${picked.length} exercise${picked.length > 1 ? 's' : ''}`} icon="add" onPress={add} />
          )}
        </View>
      )}

      <Sheet visible={creating} onClose={() => setCreating(false)} title="Custom exercise">
        <Field label="Name" value={newName} onChangeText={setNewName} placeholder="e.g. Smith machine squat" autoFocus />
        <T muted size={13} weight="600" style={{ marginBottom: 6 }}>Muscle group</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
          {MUSCLES.filter((m) => m.key !== 'all').map((m) => (
            <Chip key={m.key} label={m.label} active={newMuscle === m.key} onPress={() => setNewMuscle(m.key as Muscle)} />
          ))}
        </View>
        <T muted size={13} weight="600" style={{ marginBottom: 6 }}>Equipment</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.lg }}>
          {EQUIPMENT.map((e) => (
            <Chip key={e} label={e[0].toUpperCase() + e.slice(1)} active={newEquipment === e} onPress={() => setNewEquipment(e)} />
          ))}
        </View>
        <Button title="Create & select" onPress={create} disabled={!newName.trim()} />
      </Sheet>
    </View>
  );
}
