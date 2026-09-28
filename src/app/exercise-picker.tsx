import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button, Chip, EmptyState, Field, IconButton, IconTile, Sheet, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { EXERCISE_LIBRARY, MUSCLES, newBlock, personalRecords } from '@/lib/training';
import { formatWeight } from '@/lib/units';
import { font, nutrientColors, radius, spacing, useTheme } from '@/theme';
import type { Equipment, Exercise, Muscle } from '@/lib/types';

const EQUIPMENT_ICON: Record<Equipment, React.ComponentProps<typeof Ionicons>['name']> = {
  barbell: 'barbell',
  dumbbell: 'barbell-outline',
  machine: 'cog-outline',
  cable: 'git-pull-request-outline',
  bodyweight: 'body-outline',
  kettlebell: 'fitness-outline',
  band: 'infinite-outline',
  cardio: 'heart-outline',
};

const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell'];

export default function ExercisePicker() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
    const on = picked.includes(item.id);
    const pr = prs[item.id];
    return (
      <Pressable
        onPress={() => toggle(item.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: spacing.sm, borderRadius: 14, backgroundColor: on ? colors.primarySoft : 'transparent' }}
      >
        <IconTile icon={EQUIPMENT_ICON[item.equipment]} color={on ? colors.primary : nutrientColors.protein} size={38} />
        <View style={{ flex: 1 }}>
          <T weight="700" numberOfLines={1}>{item.name}</T>
          <T size={12} muted numberOfLines={1}>
            {item.muscle[0].toUpperCase() + item.muscle.slice(1)} · {item.equipment}
            {pr ? ` · best ${item.bodyweight || !pr.kg ? `${pr.reps} reps` : formatWeight(pr.kg, state.settings.units, 0) + ' × ' + pr.reps}` : ''}
          </T>
        </View>
        <Ionicons name={on ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={on ? colors.primary : colors.textMuted} />
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T size={20} weight="800" style={{ flex: 1 }}>Add exercises</T>
        <IconButton label="New custom exercise" icon="create-outline" color={colors.primary} onPress={() => setCreating(true)} />
        <IconButton label="Close" icon="close" color={colors.text} onPress={() => router.back()} />
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
        contentContainerStyle={{ paddingHorizontal: spacing.sm + 2, paddingBottom: insets.bottom + 100 }}
        ListEmptyComponent={<EmptyState icon="search" title="No match" body="Create it as a custom exercise with the pencil button." />}
      />
      {picked.length > 0 && (
        <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: insets.bottom + spacing.md }}>
          <Button title={`Add ${picked.length} exercise${picked.length > 1 ? 's' : ''}`} icon="add" onPress={add} />
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
