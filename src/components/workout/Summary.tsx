import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge, Card, CountUp, T } from '../ui';
import { FadeIn, nativeDriver } from '../motion';
import { ExerciseFigure } from '../exercise/ExerciseFigure';
import { mix, muscleAccent, MuscleMap } from '../exercise/MuscleMap';
import { useStore } from '@/store/StoreProvider';
import { REGION_LABEL, type MuscleRegion } from '@/lib/exerciseInfo';
import { doneSets, durationMinutes, findExercise, oneRepMax, workoutVolume } from '@/lib/training';
import { bestSet, compareWorkouts, totalReps } from '@/lib/workoutSummary';
import { prettyDate, shortDate } from '@/lib/dates';
import { formatWeight, weightUnit, weightValue } from '@/lib/units';
import { nutrientColors, radius, spacing, useTheme } from '@/theme';
import type { UnitSystem, Workout, WorkoutSet } from '@/lib/types';

/** "80 kg × 5", or "12 reps" for bodyweight work. */
export function setLabel(s: Pick<WorkoutSet, 'kg' | 'reps'>, units: UnitSystem, bodyweight?: boolean): string {
  if (bodyweight || !s.kg) return `${s.reps} reps`;
  return `${+weightValue(s.kg, units).toFixed(1)} ${weightUnit(units)} × ${s.reps}`;
}

const GOLD = '#FFD66B';

/** A medal that springs in: the "you did it" moment at the top of a fresh summary. */
function Medal() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, delay: 150, useNativeDriver: nativeDriver, damping: 9, stiffness: 150, mass: 0.8 }).start();
  }, [v]);
  return (
    <Animated.View
      style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,214,107,0.18)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,214,107,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] }) }],
        opacity: v,
      }}
    >
      <Ionicons name="trophy" size={30} color={GOLD} />
    </Animated.View>
  );
}

/** The gradient header: name, date and the four headline numbers. */
export function WorkoutHero({ w, fresh, prCount, xp }: { w: Workout; fresh?: boolean; prCount: number; xp?: number }) {
  const { state } = useStore();
  const { colors } = useTheme();
  const units = state.settings.units;
  const volume = weightValue(workoutVolume(w), units);
  const stats: { label: string; value: number; suffix?: string }[] = [
    { label: 'Duration', value: durationMinutes(w), suffix: 'min' },
    { label: 'Volume', value: Math.round(volume), suffix: weightUnit(units) },
    { label: 'Sets', value: doneSets(w) },
    { label: 'Reps', value: totalReps(w) },
  ];
  const start = new Date(w.startedAt);
  const time = `${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')}`;
  return (
    <FadeIn>
      <LinearGradient colors={[colors.hero[0], colors.hero[1], colors.hero[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg + 4, padding: spacing.lg, marginBottom: spacing.md, overflow: 'hidden' }}>
        {/* soft glow in the corner */}
        <View style={{ position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)' }} />
        {fresh ? (
          <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <Medal />
            <T size={12} weight="800" color={GOLD} style={{ marginTop: 10, letterSpacing: 1.4 }}>WORKOUT COMPLETE</T>
            <T size={26} weight="800" color="#fff" center numberOfLines={2} style={{ marginTop: 2 }}>{w.name}</T>
            <T size={13} color="rgba(255,255,255,0.72)" center>{prettyDate(w.date)} · {time}</T>
          </View>
        ) : (
          <View style={{ marginBottom: spacing.md }}>
            <T size={24} weight="800" color="#fff" numberOfLines={2}>{w.name}</T>
            <T size={13} color="rgba(255,255,255,0.72)">{prettyDate(w.date)} · {time}</T>
          </View>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {stats.map((s, i) => (
            <View key={s.label} style={{ width: '48.5%', flexGrow: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 }}>
              <T size={11} weight="700" color="rgba(255,255,255,0.66)" style={{ letterSpacing: 0.6 }}>{s.label.toUpperCase()}</T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <CountUp value={s.value} delay={fresh ? 250 + i * 90 : 0} size={24} weight="800" color="#fff" />
                {s.suffix ? <T size={13} weight="700" color="rgba(255,255,255,0.7)">{s.suffix}</T> : null}
              </View>
            </View>
          ))}
        </View>
        {(xp || prCount > 0) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md }}>
            {xp ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,214,107,0.16)', borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6 }}>
                <Ionicons name="flash" size={13} color={GOLD} />
                <T size={13} weight="800" color={GOLD}>+{xp} XP</T>
              </View>
            ) : null}
            {prCount > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,214,107,0.16)', borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6 }}>
                <Ionicons name="trophy" size={13} color={GOLD} />
                <T size={13} weight="800" color={GOLD}>{prCount} new PR{prCount > 1 ? 's' : ''}</T>
              </View>
            ) : null}
          </View>
        ) : null}
      </LinearGradient>
    </FadeIn>
  );
}

function Delta({ label, value, unit, better = 'up' }: { label: string; value: number; unit: string; better?: 'up' | 'none' }) {
  const { colors } = useTheme();
  const up = value > 0;
  const flat = Math.round(value) === 0;
  const tone = flat || better === 'none' ? colors.textMuted : up ? colors.success : colors.warning;
  return (
    <View style={{ flex: 1, backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: 10 }}>
      <T size={11} weight="700" muted>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
        {!flat ? <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={13} color={tone} /> : null}
        <T size={15} weight="800" color={flat ? colors.text : tone} numberOfLines={1}>
          {flat ? 'Same' : `${Math.abs(Math.round(value)).toLocaleString()} ${unit}`}
        </T>
      </View>
    </View>
  );
}

/** "Compared with last Push": volume, sets and time against the previous session with the same name. */
export function CompareCard({ w, prev }: { w: Workout; prev?: Workout }) {
  const { state } = useStore();
  const { colors } = useTheme();
  const units = state.settings.units;
  if (!prev) {
    return (
      <FadeIn delay={120}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="flag" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <T weight="800">Your baseline is set</T>
            <T size={13} muted>Next time you do {w.name}, you'll see how you compare.</T>
          </View>
        </Card>
      </FadeIn>
    );
  }
  const d = compareWorkouts(w, prev);
  const vol = weightValue(d.volume, units);
  const headline = d.volume > 0 ? `You moved ${Math.round(vol).toLocaleString()} ${weightUnit(units)} more than last time.` : d.volume < 0 ? 'A bit lighter than last time. Recovery counts too.' : 'Right on par with last time.';
  return (
    <FadeIn delay={120}>
      <Card style={{ padding: spacing.md }}>
        <T size={12} weight="800" muted style={{ letterSpacing: 1 }}>VS LAST {w.name.toUpperCase()} · {shortDate(prev.date).toUpperCase()}</T>
        <T weight="800" style={{ marginTop: 4, marginBottom: spacing.sm }}>{headline}</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Delta label="Volume" value={vol} unit={weightUnit(units)} />
          <Delta label="Sets" value={d.sets} unit={Math.abs(d.sets) === 1 ? 'set' : 'sets'} />
          <Delta label="Time" value={d.minutes} unit="min" better="none" />
        </View>
      </Card>
    </FadeIn>
  );
}

function RegionChips({ regions, strong }: { regions: MuscleRegion[]; strong?: boolean }) {
  const { colors } = useTheme();
  const accent = muscleAccent(colors);
  if (!regions.length) return <T size={13} muted>None</T>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {regions.map((r) => (
        <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: accent + (strong ? '26' : '12') }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: strong ? accent : mix(accent, colors.card, 0.45) }} />
          <T size={12} weight="800" color={colors.text}>{REGION_LABEL[r]}</T>
        </View>
      ))}
    </View>
  );
}

/** Front and back body with the worked muscles, plus the primary / secondary lists. */
export function MusclesWorked({ primary, secondary, title = 'Muscles worked', delay = 160 }: { primary: MuscleRegion[]; secondary: MuscleRegion[]; title?: string; delay?: number }) {
  const { width } = useWindowDimensions();
  const size = Math.min(280, Math.max(200, width - 120));
  return (
    <FadeIn delay={delay}>
      <Card style={{ padding: spacing.md }}>
        <T size={17} weight="800">{title}</T>
        <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
          <MuscleMap primary={primary} secondary={secondary} size={size} />
        </View>
        <T size={12} weight="800" muted style={{ letterSpacing: 1, marginBottom: 6 }}>PRIMARY</T>
        <RegionChips regions={primary} strong />
        <T size={12} weight="800" muted style={{ letterSpacing: 1, marginTop: spacing.md, marginBottom: 6 }}>SECONDARY</T>
        <RegionChips regions={secondary} />
      </Card>
    </FadeIn>
  );
}

/** One row per exercise: its figure, sets and best set. Tap for the exercise's details. */
export function ExerciseResults({ w, prs, showSets }: { w: Workout; prs: string[]; showSets?: boolean }) {
  const { state } = useStore();
  const custom = state.customExercises;
  const { colors } = useTheme();
  const units = state.settings.units;
  return (
    <FadeIn delay={200}>
      <T size={17} weight="800" style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>Exercises</T>
      <Card style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.md }}>
        {w.exercises.map((e, i) => {
          const x = findExercise(e.exerciseId, custom);
          const done = e.sets.filter((s) => s.done);
          const best = bestSet(e.sets);
          const pr = prs.includes(e.exerciseId);
          return (
            <Pressable
              key={e.exerciseId + i}
              onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.exerciseId } })}
              accessibilityRole="button"
              accessibilityLabel={`${x?.name ?? 'Exercise'} details`}
              style={({ pressed }) => ({ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ borderRadius: 14, backgroundColor: colors.cardAlt, padding: 2 }}>
                  <ExerciseFigure exerciseId={e.exerciseId} customExercises={custom} size={48} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <T weight="800" numberOfLines={1} style={{ flexShrink: 1 }}>{x?.name ?? 'Exercise'}</T>
                    {pr ? <Badge label="PR" icon="trophy" color={nutrientColors.carbs} solid /> : null}
                  </View>
                  <T size={13} muted numberOfLines={1}>
                    {done.length} {done.length === 1 ? 'set' : 'sets'}
                    {best ? ` · best ${setLabel(best, units, x?.bodyweight)}` : ''}
                  </T>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
              {showSets && done.length ? (
                <View style={{ marginTop: 8, marginLeft: 64, gap: 2 }}>
                  {done.map((s, si) => (
                    <View key={si} style={{ flexDirection: 'row' }}>
                      <T size={13} muted weight="700" style={{ width: 22 }}>{si + 1}</T>
                      <T size={13} weight={s === best ? '800' : '500'} style={{ flex: 1 }}>{setLabel(s, units, x?.bodyweight)}</T>
                      {s.kg > 0 && s.reps > 1 ? <T size={12} muted>e1RM {formatWeight(oneRepMax(s.kg, s.reps), units, 0)}</T> : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </Card>
    </FadeIn>
  );
}
