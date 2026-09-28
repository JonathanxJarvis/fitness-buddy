import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, Field, Screen, Segmented, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { useTheme, radius, spacing, nutrientColors } from '@/theme';
import { ACTIVITY_LEVELS, calculateGoals } from '@/lib/nutrition';
import { inToCm, lbToKg, kgToLb, cmToIn, weightUnit } from '@/lib/units';
import { todayKey } from '@/lib/dates';
import type { ActivityLevel, GoalType, Profile, Sex, UnitSystem } from '@/lib/types';

const GOALS: { key: GoalType; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; hint: string }[] = [
  { key: 'lose', label: 'Lose weight', icon: 'trending-down', hint: 'Eat in a calorie deficit' },
  { key: 'maintain', label: 'Maintain weight', icon: 'remove', hint: 'Stay where you are, eat better' },
  { key: 'gain', label: 'Gain weight', icon: 'trending-up', hint: 'Build muscle with a small surplus' },
];

const RATES_KG = [0.25, 0.5, 0.75, 1];

function Option({ selected, onPress, title, hint, icon }: { selected: boolean; onPress: () => void; title: string; hint?: string; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: spacing.lg,
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : colors.card,
        marginBottom: spacing.sm,
      }}
    >
      {icon && <Ionicons name={icon} size={22} color={colors.primary} />}
      <View style={{ flex: 1 }}>
        <T weight="700">{title}</T>
        {hint ? <T muted size={13}>{hint}</T> : null}
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
    </Pressable>
  );
}

export default function Onboarding() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const editing = !!state.profile;
  const p = state.profile;

  const [step, setStep] = useState(0);
  const [units, setUnits] = useState<UnitSystem>(state.settings.units);
  const [sex, setSex] = useState<Sex>(p?.sex ?? 'female');
  const [age, setAge] = useState(p ? String(p.age) : '');
  const [heightCm, setHeightCm] = useState(p ? String(Math.round(p.heightCm)) : '');
  const [heightFt, setHeightFt] = useState(p ? String(Math.floor(cmToIn(p.heightCm) / 12)) : '');
  const [heightIn, setHeightIn] = useState(p ? String(Math.round(cmToIn(p.heightCm) % 12)) : '');
  const [weight, setWeight] = useState(
    p ? (units === 'us' ? kgToLb(p.weightKg) : p.weightKg).toFixed(1).replace(/\.0$/, '') : '',
  );
  const [name, setName] = useState(p?.name ?? '');
  const [activity, setActivity] = useState<ActivityLevel>(p?.activity ?? 'light');
  const [goal, setGoal] = useState<GoalType>(p?.goal ?? 'lose');
  const [rate, setRate] = useState(p?.weeklyRateKg ?? 0.5);

  const switchUnits = (u: UnitSystem) => {
    if (u === units) return;
    const w = parseFloat(weight);
    if (Number.isFinite(w)) setWeight((u === 'us' ? kgToLb(w) : lbToKg(w)).toFixed(1).replace(/\.0$/, ''));
    if (u === 'metric') {
      const inches = (parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0);
      if (inches > 0) setHeightCm(String(Math.round(inToCm(inches))));
    } else {
      const cm = parseFloat(heightCm);
      if (cm > 0) {
        const total = Math.round(cmToIn(cm));
        setHeightFt(String(Math.floor(total / 12)));
        setHeightIn(String(total % 12));
      }
    }
    setUnits(u);
  };

  const profile: Profile | null = useMemo(() => {
    const a = parseInt(age, 10);
    const w = parseFloat(weight);
    const h = units === 'metric' ? parseFloat(heightCm) : inToCm((parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0));
    if (!(a >= 13 && a <= 100) || !(w > 0) || !(h > 90 && h < 250)) return null;
    return {
      name: name.trim() || undefined,
      sex,
      age: a,
      heightCm: h,
      weightKg: units === 'us' ? lbToKg(w) : w,
      activity,
      goal,
      weeklyRateKg: goal === 'maintain' ? 0 : rate,
    };
  }, [name, age, weight, heightCm, heightFt, heightIn, units, sex, activity, goal, rate]);

  const goals = profile ? calculateGoals(profile) : null;

  const finish = () => {
    if (!profile || !goals) return;
    dispatch({ type: 'updateSettings', settings: { units } });
    dispatch({ type: 'setProfile', profile, goals, date: todayKey() });
    if (editing && router.canGoBack()) router.back();
    else router.replace('/');
  };

  const bodyValid = profile !== null;
  const steps = [
    // 0: welcome + units
    <View key="0">
      <View style={{ alignItems: 'center', marginVertical: spacing.xl }}>
        <LinearGradient colors={colors.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="leaf" size={46} color="#fff" />
        </LinearGradient>
        <T size={28} weight="800" style={{ marginTop: spacing.lg }} center>
          {editing ? 'Update your goals' : 'Welcome to Fitness Buddy'}
        </T>
        <T muted center style={{ marginTop: spacing.sm }}>
          A few questions and we’ll build your daily calorie and macro plan, with protein set to 1 g per lb of body weight. Everything stays on your phone.
        </T>
      </View>
      <Field label="Your first name (optional)" value={name} onChangeText={setName} placeholder="Jake" autoCapitalize="words" />
      <T muted size={13} weight="600" style={{ marginBottom: 6 }}>Units</T>
      <Segmented
        value={units}
        onChange={switchUnits}
        options={[
          { key: 'us', label: 'US (lb, ft, fl oz)' },
          { key: 'metric', label: 'Metric (kg, cm, ml)' },
        ]}
      />
    </View>,
    // 1: body
    <View key="1">
      <T size={24} weight="800" style={{ marginBottom: spacing.lg }}>About you</T>
      <T weight="700" style={{ marginBottom: spacing.sm }}>Sex</T>
      <Segmented
        value={sex}
        onChange={setSex}
        options={[
          { key: 'female', label: 'Female' },
          { key: 'male', label: 'Male' },
        ]}
        style={{ marginBottom: spacing.lg }}
      />
      <Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="30" suffix="years" />
      {units === 'metric' ? (
        <Field label="Height" value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" placeholder="170" suffix="cm" />
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Field style={{ flex: 1 }} label="Height" value={heightFt} onChangeText={setHeightFt} keyboardType="number-pad" placeholder="5" suffix="ft" />
          <Field style={{ flex: 1 }} label=" " value={heightIn} onChangeText={setHeightIn} keyboardType="number-pad" placeholder="8" suffix="in" />
        </View>
      )}
      <Field label="Current weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder={units === 'us' ? '165' : '75'} suffix={weightUnit(units)} />
      {!bodyValid && (age || weight) ? <T muted size={13}>Enter an age between 13 and 100, your height and weight.</T> : null}
    </View>,
    // 2: activity
    <View key="2">
      <T size={24} weight="800" style={{ marginBottom: spacing.lg }}>How active are you?</T>
      {ACTIVITY_LEVELS.map((a) => (
        <Option key={a.key} selected={activity === a.key} onPress={() => setActivity(a.key)} title={a.label} hint={a.hint} />
      ))}
    </View>,
    // 3: goal
    <View key="3">
      <T size={24} weight="800" style={{ marginBottom: spacing.lg }}>What’s your goal?</T>
      {GOALS.map((g) => (
        <Option key={g.key} selected={goal === g.key} onPress={() => setGoal(g.key)} title={g.label} hint={g.hint} icon={g.icon} />
      ))}
      {goal !== 'maintain' && (
        <>
          <T weight="700" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
            Pace per week
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {RATES_KG.map((r) => {
              const active = rate === r;
              const label = units === 'us' ? `${(r * 2.20462).toFixed(1).replace(/\.0$/, '')} lb` : `${r} kg`;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRate(r)}
                  style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: active ? colors.primary : colors.cardAlt }}
                >
                  <T weight="700" color={active ? colors.onPrimary : colors.text}>{label}</T>
                </Pressable>
              );
            })}
          </View>
          <T muted size={13} style={{ marginTop: spacing.sm }}>
            {goal === 'lose' ? 'A slower pace is easier to stick with.' : 'Lean gains work best with a small surplus.'}
          </T>
        </>
      )}
    </View>,
    // 4: summary
    <View key="4">
      <T size={24} weight="800" style={{ marginBottom: spacing.sm }}>Your daily plan</T>
      <T muted style={{ marginBottom: spacing.lg }}>You can fine-tune these any time from your profile.</T>
      {goals && (
        <Card>
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <T size={44} weight="800" color={colors.primary}>{goals.calories.toLocaleString()}</T>
            <T muted>calories per day</T>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {([['Protein', goals.protein, nutrientColors.protein], ['Carbs', goals.carbs, nutrientColors.carbs], ['Fat', goals.fat, nutrientColors.fat]] as const).map(([l, v, c]) => (
              <View key={l} style={{ alignItems: 'center' }}>
                <T size={22} weight="800" color={c}>{v} g</T>
                <T muted size={13}>{l}</T>
              </View>
            ))}
          </View>
          <T size={12} muted center style={{ marginTop: spacing.md }}>Protein target: 1 g per lb of body weight</T>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.lg }}>
            <View style={{ alignItems: 'center' }}>
              <T size={18} weight="700">{goals.fiber} g</T>
              <T muted size={13}>Fiber</T>
            </View>
            <View style={{ alignItems: 'center' }}>
              <T size={18} weight="700">{goals.steps.toLocaleString()}</T>
              <T muted size={13}>Steps</T>
            </View>
          </View>
        </Card>
      )}
    </View>,
  ];

  const canNext = step !== 1 || bodyValid;
  const last = step === steps.length - 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen topInset>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.xl }}>
          {steps.map((_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.primary : colors.track }} />
          ))}
        </View>
        {steps[step]}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
          {step > 0 ? (
            <Button title="Back" variant="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />
          ) : editing ? (
            <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          ) : null}
          <Button
            title={last ? (editing ? 'Save goals' : 'Start tracking') : 'Continue'}
            onPress={last ? finish : () => setStep(step + 1)}
            disabled={!canNext}
            style={{ flex: 2 }}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
