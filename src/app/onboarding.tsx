import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Field, Screen, Segmented, T } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { PETS, type Mood, type Species } from '@/components/Mascot';
import { PetGuide } from '@/components/onboarding/PetGuide';
import { ChoiceRow, NumberPicks, TrendGlyph, WeekStrip } from '@/components/onboarding/Choices';
import { AccentChoice, LookChoice, TrainingChoice } from '@/components/personalize/Personalize';
import {
  ACTIVITY_REPLY,
  DAYS_REPLY,
  EXPERIENCE,
  GOAL_REPLY,
  MOTIVATIONS,
  OBSTACLES,
  LOOK_REPLY,
  PEP,
  SLEEP,
  TRAINING_REPLY,
  onboardingMode,
  planForDays,
  splitForDays,
  type Pick,
} from '@/components/onboarding/script';
import { useStore } from '@/store/StoreProvider';
import { useTheme, radius, spacing, nutrientColors } from '@/theme';
import { ACTIVITY_LEVELS, calculateGoals } from '@/lib/nutrition';
import { inToCm, lbToKg, kgToLb, cmToIn, weightUnit } from '@/lib/units';
import { todayKey } from '@/lib/dates';
import { findSplit } from '@/lib/plan';
import { planRoutineChanges, restForGoal } from '@/lib/trainingPrefs';
import type { ActivityLevel, GoalType, OnboardingAnswers, Profile, Settings, Sex, TrainingPrefs, UnitSystem } from '@/lib/types';

const GOALS: { key: GoalType; label: string; dir: 'down' | 'flat' | 'up'; hint: string }[] = [
  { key: 'lose', label: 'Lose weight', dir: 'down', hint: 'Eat in a calorie deficit' },
  { key: 'maintain', label: 'Maintain weight', dir: 'flat', hint: 'Stay where you are, eat better' },
  { key: 'gain', label: 'Gain weight', dir: 'up', hint: 'Build muscle with a small surplus' },
];

const RATES_KG = [0.25, 0.5, 0.75, 1];
const DAYS = [2, 3, 4, 5, 6].map((d) => ({ key: d, label: String(d) }));

type StepKey = 'hello' | 'petName' | 'body' | 'activity' | 'goal' | 'motivation' | 'experience' | 'days' | 'training' | 'obstacle' | 'sleep' | 'look' | 'plan';
const NEW_STEPS: StepKey[] = ['hello', 'petName', 'body', 'activity', 'goal', 'motivation', 'experience', 'days', 'training', 'obstacle', 'sleep', 'look', 'plan'];
const EDIT_STEPS: StepKey[] = ['hello', 'body', 'activity', 'goal', 'plan'];

export default function Onboarding() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  // `?fresh=1` runs the full new-user flow even with a profile ("Redo onboarding" in Profile).
  const { fresh } = useLocalSearchParams<{ fresh?: string }>();
  // Fixed at mount: finishing sets a profile, which must not swap the step list mid-render.
  const [editing] = useState(() => onboardingMode(!!state.profile, fresh) === 'edit');
  const [redo] = useState(() => !!state.profile && !editing);
  const prev = state.settings.onboarding;
  const p = state.profile;
  const species = (state.settings.pet ?? 'kettle') as Species;
  const defPetName = PETS.find((x) => x.key === species)?.name ?? 'Kettle';

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

  // New-user extras
  const [petName, setPetName] = useState(state.settings.petName ?? defPetName);
  const [motivation, setMotivation] = useState<string | undefined>(prev?.motivation);
  const [experience, setExperience] = useState<string | undefined>(prev?.experience);
  const [days, setDays] = useState<number | undefined>(prev?.daysPerWeek);
  const [obstacle, setObstacle] = useState<string | undefined>(prev?.obstacle);
  const [sleep, setSleep] = useState<number | undefined>(prev?.sleepHours);
  const [training, setTraining] = useState<TrainingPrefs>(state.settings.training ?? {});
  const look = state.settings.look ?? 'colorful';
  const accent = state.settings.accent ?? 'emerald';

  // What the pet says after you answer (cleared on each new step).
  const [reaction, setReaction] = useState<{ line: string; mood: Mood } | null>(null);
  const react = (line: string, mood: Mood) => setReaction({ line, mood });

  const steps = editing ? EDIT_STEPS : NEW_STEPS;
  const key = steps[step];
  useEffect(() => setReaction(null), [step]);

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
  const buddy = petName.trim() || defPetName;
  const first = name.trim().split(/\s+/)[0] ?? '';
  const makePlan = !editing && days !== undefined && !state.plan;

  const finish = () => {
    if (!profile || !goals) return;
    const settings: Partial<Settings> = { units };
    if (!editing) {
      settings.petName = buddy.slice(0, 16);
      const answers: OnboardingAnswers = {};
      if (motivation) answers.motivation = motivation;
      if (experience) answers.experience = experience;
      if (days !== undefined) answers.daysPerWeek = days;
      if (obstacle) answers.obstacle = obstacle;
      if (sleep !== undefined) answers.sleepHours = sleep;
      settings.onboarding = answers;
      if (Object.keys(training).length) settings.training = training;
    }
    dispatch({ type: 'updateSettings', settings });
    dispatch({ type: 'setProfile', profile, goals, date: todayKey() });
    if (makePlan) {
      const plan = planForDays(days, todayKey());
      dispatch({ type: 'setPlan', plan });
      for (const routine of planRoutineChanges({ plan, routines: state.routines }, training).save) dispatch({ type: 'saveRoutine', routine });
      const rest = restForGoal(training.goal);
      if (rest) dispatch({ type: 'setRestSeconds', seconds: rest });
    }
    if (editing && router.canGoBack()) router.back();
    else router.replace('/');
  };

  const bodyValid = profile !== null;

  // ---- what the pet says on each step ----
  const script: Record<StepKey, { line: string; mood: Mood }> = {
    hello: editing
      ? { line: `Back to fine-tune your goals${first ? `, ${first}` : ''}? Let’s keep it quick.`, mood: 'wink' }
      : redo
        ? { line: `Starting over${first ? `, ${first}` : ''}? Good. Your logs stay safe, we’re just catching up from the top.`, mood: 'happy' }
        : { line: `Hi, I’m ${defPetName}. I’ll be in your corner from today on. First things first: what’s your name?`, mood: 'happy' },
    petName: { line: `Nice to meet you${first ? `, ${first}` : ''}. Most people call me ${defPetName}, but you can pick something else.`, mood: 'wink' },
    body: { line: editing ? 'Anything changed? Update what you need.' : 'Now a little about you. This stays on your phone, just between us.', mood: 'happy' },
    activity: { line: 'How much do you move in a normal week, outside of workouts too?', mood: 'happy' },
    goal: { line: 'What are we working toward together?', mood: 'happy' },
    motivation: { line: 'And what’s driving you? Knowing your why helps me cheer you on.', mood: 'happy' },
    experience: { line: 'How much training have you done before? No wrong answers.', mood: 'happy' },
    days: { line: 'How many days a week can you realistically train? Be honest, I will be.', mood: 'wink' },
    training: { line: 'How do you like to train? I’ll shape your workouts to fit.', mood: 'pumped' },
    obstacle: { line: 'What usually gets in the way? I’ll plan around it.', mood: 'happy' },
    sleep: { line: 'How many hours do you sleep on a typical night?', mood: 'sleepy' },
    look: { line: 'Last one. How should the app look? Bright or calm, your call.', mood: 'wink' },
    plan: {
      line: editing
        ? 'Here’s your updated plan. Looking good.'
        : `This is it${first ? `, ${first}` : ''}. Your daily plan, built around you. I’m proud of you for starting.`,
      mood: 'proud',
    },
  };
  const said = reaction ?? script[key];

  const pick = <K extends string | number>(opts: Pick<K>[], k: K, set: (k: K) => void) => {
    set(k);
    const o = opts.find((x) => x.key === k);
    if (o) react(o.reply, o.mood);
  };

  const unitW = (r: number) => (units === 'us' ? `${(r * 2.20462).toFixed(1).replace(/\.0$/, '')} lb` : `${r} kg`);

  const body: Record<StepKey, React.ReactNode> = {
    hello: (
      <View>
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
        {!editing && (
          <T muted size={13} style={{ marginTop: spacing.lg, lineHeight: 19 }}>
            A few questions and we’ll build your daily calorie and macro plan, with protein set to 1 g per lb of body weight. Everything stays on your phone.
          </T>
        )}
      </View>
    ),
    petName: (
      <View>
        <Field
          label="Your buddy’s name"
          value={petName}
          onChangeText={setPetName}
          placeholder={defPetName}
          autoCapitalize="words"
          maxLength={16}
          onEndEditing={() => {
            const n = petName.trim();
            if (n && n !== defPetName) react(`${n}. I like that. It suits me.`, 'pumped');
          }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[defPetName, 'Coach', 'Buddy', 'Iron'].map((n) => {
            const on = buddy === n;
            return (
              <Pressable
                key={n}
                onPress={() => {
                  setPetName(n);
                  react(n === defPetName ? 'The classic. Good call.' : `${n}. I like that. It suits me.`, n === defPetName ? 'happy' : 'pumped');
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  borderColor: on ? colors.primary : colors.border,
                  backgroundColor: on ? colors.primarySoft : colors.card,
                }}
              >
                <T size={14} weight="700" color={on ? colors.primary : colors.text}>{n}</T>
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    body: (
      <View>
        <T muted size={13} weight="600" style={{ marginBottom: 6 }}>Sex</T>
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
      </View>
    ),
    activity: (
      <View>
        {ACTIVITY_LEVELS.map((a, i) => (
          <ChoiceRow
            key={a.key}
            index={i}
            selected={activity === a.key}
            onPress={() => {
              setActivity(a.key);
              react(ACTIVITY_REPLY[a.key] ?? 'Got it.', a.key === 'sedentary' ? 'wink' : a.key === 'active' || a.key === 'very_active' ? 'pumped' : 'happy');
            }}
            title={a.label}
            hint={a.hint}
          />
        ))}
      </View>
    ),
    goal: (
      <View>
        {GOALS.map((g, i) => (
          <ChoiceRow
            key={g.key}
            index={i}
            selected={goal === g.key}
            onPress={() => {
              setGoal(g.key);
              react(GOAL_REPLY[g.key].reply, GOAL_REPLY[g.key].mood);
            }}
            title={g.label}
            hint={g.hint}
            glyph={<TrendGlyph dir={g.dir} active={goal === g.key} />}
          />
        ))}
        {goal !== 'maintain' && (
          <FadeIn>
            <T muted size={13} weight="600" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
              Pace per week
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {RATES_KG.map((r) => {
                const active = rate === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRate(r)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: active ? colors.primary : colors.cardAlt }}
                  >
                    <T weight="700" color={active ? colors.onPrimary : colors.text}>{unitW(r)}</T>
                  </Pressable>
                );
              })}
            </View>
            <T muted size={13} style={{ marginTop: spacing.sm }}>
              {goal === 'lose' ? 'A slower pace is easier to stick with.' : 'Lean gains work best with a small surplus.'}
            </T>
          </FadeIn>
        )}
      </View>
    ),
    motivation: (
      <View>
        {MOTIVATIONS.map((o, i) => (
          <ChoiceRow key={o.key} index={i} selected={motivation === o.key} onPress={() => pick(MOTIVATIONS, o.key, setMotivation)} title={o.label} hint={o.hint} />
        ))}
      </View>
    ),
    experience: (
      <View>
        {EXPERIENCE.map((o, i) => (
          <ChoiceRow key={o.key} index={i} selected={experience === o.key} onPress={() => pick(EXPERIENCE, o.key, setExperience)} title={o.label} hint={o.hint} />
        ))}
      </View>
    ),
    days: (
      <View>
        <NumberPicks
          options={DAYS}
          value={days}
          onChange={(d) => {
            setDays(d);
            react(DAYS_REPLY[d], d >= 5 ? 'pumped' : 'happy');
          }}
        />
        <T muted size={13} center style={{ marginTop: spacing.sm }}>days a week</T>
        {days !== undefined && (
          <FadeIn key={days} style={{ marginTop: spacing.xl }}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.md }}>
                <T weight="800" size={16}>{findSplit(splitForDays(days)).name}</T>
                <T muted size={12} weight="600">{state.plan ? 'You already have a plan' : 'Starter plan'}</T>
              </View>
              <WeekStrip week={planForDays(days, todayKey()).week} />
              <T muted size={13} style={{ marginTop: spacing.md }}>
                {state.plan ? 'Your current plan stays as it is.' : 'You can swap days or change the split any time from Train.'}
              </T>
            </Card>
          </FadeIn>
        )}
      </View>
    ),
    training: (
      <View>
        <TrainingChoice
          value={training}
          onChange={(next, part) => {
            setTraining(next);
            const r = TRAINING_REPLY[`${part}:${next[part]}`];
            if (r) react(r.reply, r.mood);
          }}
        />
        <T muted size={13} style={{ marginTop: spacing.md }}>Your workouts, reps and rest timer follow these. Change them any time in your profile.</T>
      </View>
    ),
    obstacle: (
      <View>
        {OBSTACLES.map((o, i) => (
          <ChoiceRow key={o.key} index={i} selected={obstacle === o.key} onPress={() => pick(OBSTACLES, o.key, setObstacle)} title={o.label} hint={o.hint} />
        ))}
      </View>
    ),
    sleep: (
      <View>
        <NumberPicks options={SLEEP} value={sleep} onChange={(h) => pick(SLEEP, h, setSleep)} />
        <T muted size={13} center style={{ marginTop: spacing.sm }}>hours a night</T>
      </View>
    ),
    look: (
      <View>
        <LookChoice
          look={look}
          accent={accent}
          onChange={(l) => {
            dispatch({ type: 'updateSettings', settings: { look: l } });
            react(LOOK_REPLY[l].reply, LOOK_REPLY[l].mood);
          }}
        />
        <T muted size={13} weight="600" style={{ marginTop: spacing.lg, marginBottom: 6 }}>Accent color</T>
        <AccentChoice accent={accent} onChange={(a) => dispatch({ type: 'updateSettings', settings: { accent: a } })} />
      </View>
    ),
    plan: goals ? (
      <View>
        <Card style={{ paddingVertical: spacing.xl }}>
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <T muted size={12} weight="700" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>Every day</T>
            <T size={46} weight="800" color={colors.primary} style={{ marginTop: 2 }}>{goals.calories.toLocaleString()}</T>
            <T muted>calories</T>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {([['Protein', goals.protein, nutrientColors.protein], ['Carbs', goals.carbs, nutrientColors.carbs], ['Fat', goals.fat, nutrientColors.fat]] as const).map(([l, v, c], i) => (
              <View key={l} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderColor: colors.border }}>
                <T size={22} weight="800" color={c}>{v} g</T>
                <T muted size={13}>{l}</T>
              </View>
            ))}
          </View>
          <T size={12} muted center style={{ marginTop: spacing.md }}>Protein target: 1 g per lb of body weight</T>
          <View style={{ flexDirection: 'row', marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderColor: colors.border }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <T size={18} weight="700">{goals.fiber} g</T>
              <T muted size={13}>Fiber</T>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <T size={18} weight="700">{goals.steps.toLocaleString()}</T>
              <T muted size={13}>Steps</T>
            </View>
            {makePlan && days !== undefined ? (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <T size={18} weight="700">{days}×</T>
                <T muted size={13}>Training</T>
              </View>
            ) : null}
          </View>
        </Card>
        <T muted size={13} center style={{ marginTop: spacing.md }}>You can fine-tune these any time from your profile.</T>
        {!editing && (
          <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
            <View style={{ width: 28, height: 2, borderRadius: 1, backgroundColor: colors.primary, opacity: 0.6, marginBottom: spacing.md }} />
            <T size={17} weight="700" center style={{ lineHeight: 24 }}>
              {first ? `${first} and ${buddy}.` : `You and ${buddy}.`} Day one starts now.
            </T>
          </View>
        )}
      </View>
    ) : null,
  };

  // The extra questions can be skipped; the button says so until you answer.
  const extras: Partial<Record<StepKey, unknown>> = { motivation, experience, days, obstacle, sleep, training: Object.keys(training).length ? training : undefined };
  const optional = !editing && key in extras;
  const answered = extras[key] !== undefined;
  const canNext = key !== 'body' || bodyValid;
  const last = step === steps.length - 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen topInset>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {steps.map((_, i) => (
              <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.primary : colors.track }} />
            ))}
          </View>
          <T muted size={12} weight="700" style={{ fontVariant: ['tabular-nums'] }}>
            {step + 1}/{steps.length}
          </T>
        </View>

        <PetGuide species={species} mood={said.mood} line={said.line} beat={reaction ? reaction.line : key} pep={PEP[key]} />

        <FadeIn key={key} delay={80} style={{ marginTop: spacing.xl }}>
          {body[key]}
        </FadeIn>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
          {step > 0 ? (
            <Button title="Back" variant="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />
          ) : editing || redo ? (
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={{ flex: 1 }}
            />
          ) : null}
          <Button
            title={last ? (editing ? 'Save goals' : 'Start tracking') : optional && !answered ? 'Skip' : 'Continue'}
            onPress={last ? finish : () => setStep(step + 1)}
            disabled={!canNext}
            style={{ flex: 2 }}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
