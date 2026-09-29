import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card, EmptyState, Screen, SectionTitle, T } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { Dropdown } from '@/components/Dropdown';
import { useStore } from '@/store/StoreProvider';
import { MONTH_NAMES, shortDate } from '@/lib/dates';
import { countPRs, durationMinutes, findExercise, personalRecords, workoutVolume } from '@/lib/training';
import { formatWeight, weightUnit, weightValue } from '@/lib/units';
import { nutrientColors, spacing, useTheme } from '@/theme';
import type { Workout } from '@/lib/types';

/** Every finished workout, newest first, grouped by month, with your records below. */
export default function History() {
  const { state } = useStore();
  const { colors } = useTheme();
  const units = state.settings.units;

  const months = useMemo(() => {
    const out: { key: string; label: string; items: Workout[] }[] = [];
    for (const w of [...state.workouts].reverse()) {
      const key = w.date.slice(0, 7);
      let m = out[out.length - 1];
      if (!m || m.key !== key) {
        m = { key, label: `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`, items: [] };
        out.push(m);
      }
      m.items.push(w);
    }
    return out;
  }, [state.workouts]);

  const prs = useMemo(
    () =>
      Object.entries(personalRecords(state.workouts))
        .filter(([, p]) => p.kg > 0)
        .sort((a, b) => b[1].e1rm - a[1].e1rm)
        .slice(0, 8),
    [state.workouts],
  );

  if (!state.workouts.length) {
    return (
      <Screen>
        <EmptyState icon="barbell-outline" title="No workouts yet" body="Finish a workout and it shows up here with its sets, PRs and muscles worked." />
      </Screen>
    );
  }

  return (
    <Screen>
      {prs.length > 0 && (
        <View style={{ marginBottom: spacing.sm }}>
          <Dropdown title="Personal records" summary={`${prs.length} lift${prs.length === 1 ? '' : 's'}`}>
            {prs.map(([id, p], i) => (
              <Pressable
                key={id}
                onPress={() => router.push({ pathname: '/exercise/[id]', params: { id } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
              >
                <Ionicons name="trophy" size={16} color={nutrientColors.carbs} />
                <T weight="700" style={{ flex: 1 }} numberOfLines={1}>{findExercise(id, state.customExercises)?.name ?? id}</T>
                <T size={13} muted>{formatWeight(p.kg, units, 0)} × {p.reps}</T>
                <T size={13} weight="800" style={{ width: 70, textAlign: 'right' }}>{formatWeight(p.e1rm, units, 0)}</T>
              </Pressable>
            ))}
            <T size={11} muted style={{ marginTop: 4 }}>Right column is your estimated one-rep max.</T>
          </Dropdown>
        </View>
      )}
      {months.map((m, mi) => (
        <FadeIn key={m.key} delay={Math.min(mi, 4) * 60}>
          <SectionTitle>{m.label}</SectionTitle>
          <Card style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.md }}>
            {m.items.map((w, i) => {
              const prCount = countPRs(w, state.workouts.filter((x) => x.startedAt < w.startedAt));
              return (
                <Pressable
                  key={w.id}
                  onPress={() => router.push({ pathname: '/workout-detail', params: { id: w.id } })}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 })}
                >
                  <View style={{ width: 42, alignItems: 'center' }}>
                    <T size={18} weight="800">{Number(w.date.slice(8, 10))}</T>
                    <T size={10} weight="700" muted>{shortDate(w.date).split(' ')[0].toUpperCase()}</T>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <T weight="800" numberOfLines={1} style={{ flexShrink: 1 }}>{w.name}</T>
                      {prCount > 0 && <Badge label={`${prCount} PR`} icon="trophy" color={nutrientColors.carbs} />}
                    </View>
                    <T size={12} muted numberOfLines={1}>
                      {durationMinutes(w)} min · {w.exercises.length} exercises · {Math.round(weightValue(workoutVolume(w), units)).toLocaleString()} {weightUnit(units)}
                    </T>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </Card>
        </FadeIn>
      ))}

    </Screen>
  );
}
