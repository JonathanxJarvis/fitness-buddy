import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button, Card, Field, IconButton, IconTile, ProgressBar, Segmented, Sheet, T, type IconName } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { ProMark } from '@/components/ProMark';
import { MEAL_PHOTOS, MealImage } from '@/components/meal/MealImage';
import { resolveFavoriteIds } from '@/components/meal/favoritesAi';
import { MEAL_ACCENT } from '@/components/today/MealIcons';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { isPro } from '@/lib/pro';
import { findMeal, INGREDIENTS } from '@/lib/meals';
import {
  amountText,
  applySwap,
  dayError,
  dayTotals,
  DIETS,
  generateMealPlan,
  itemsNutrients,
  matchFavorites,
  newSeed,
  PLAN_MODES,
  PLAN_STYLES,
  plannedFavorites,
  plannedMealFood,
  shoppingAmount,
  shoppingList,
  swapOptions,
  TOLERANCE,
  type MealDiet,
  type MealPlanState,
  type PlanMode,
  type PlanStyle,
  type PlanDay,
  type PlannedMeal,
  type ShoppingItem,
} from '@/lib/mealPlan';
import { addDays, fromKey, MONTH_NAMES, todayKey } from '@/lib/dates';
import { MEALS as SLOT_INFO } from '@/lib/types';
import { nutrientColors, radius, spacing, useTheme } from '@/theme';

const tap = () => Haptics.selectionAsync().catch(() => {});
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const slotLabel = (slot: string) => (slot === 'snacks' ? 'Snack' : SLOT_INFO.find((m) => m.key === slot)?.label ?? slot);

function useGoals() {
  const { state } = useStore();
  return { calories: state.goals?.calories ?? 2000, protein: state.goals?.protein ?? 130 };
}

function defaultDiet(state: { settings: { onboarding?: { diet?: string } } }): MealDiet {
  const d = state.settings.onboarding?.diet;
  return DIETS.some((x) => x.key === d) ? (d as MealDiet) : 'any';
}

/** A diary entry for a planned meal, portion as planned. */
function plannedEntry(pm: PlannedMeal, date: string) {
  return { id: uid(), date, meal: pm.slot, food: plannedMealFood(pm), servingIndex: 0, quantity: 1, createdAt: Date.now() };
}

// ---------- header ----------

function Header({ right }: { right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <IconButton label="Back" icon="chevron-back" size={24} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <T size={20} weight="800">Meal plan</T>
        <ProMark size={12} />
      </View>
      {right}
    </View>
  );
}

// ---------- pieces ----------

function MacroLine({ kcal, protein, muted }: { kcal: number; protein: number; muted?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: nutrientColors.calories }} />
        <T size={13} weight="700" color={muted ? colors.textMuted : colors.text}>{fmt(kcal)} kcal</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: nutrientColors.protein }} />
        <T size={13} weight="700" color={muted ? colors.textMuted : colors.text}>{fmt(protein)} g protein</T>
      </View>
    </View>
  );
}

function MealBlock({
  pm,
  onLog,
  onSwap,
  logged,
  preview,
}: {
  pm: PlannedMeal;
  onLog?: () => void;
  onSwap?: () => void;
  logged?: boolean;
  preview?: boolean;
}) {
  const { colors } = useTheme();
  const meal = findMeal(pm.mealId);
  const n = itemsNutrients(pm.items);
  const accent = MEAL_ACCENT[pm.slot];
  const [open, setOpen] = useState(!!preview);
  if (!meal) return null;
  return (
    <Card style={{ padding: 0, marginBottom: spacing.md }}>
      <View>
        <MealImage mealId={pm.mealId} aspectRatio={2.2} rounded={0} iconSize={34} style={{ borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }} />
        <View style={{ position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.card }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: accent }} />
          <T size={11} weight="800" color={accent} style={{ letterSpacing: 0.8 }}>{slotLabel(pm.slot).toUpperCase()}</T>
        </View>
        <View style={{ position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.card }}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <T size={11} weight="700" muted>{meal.prepMinutes} min</T>
        </View>
      </View>
      <View style={{ padding: spacing.lg }}>
        <T size={17} weight="800">{meal.name}</T>
        {meal.nameDe !== meal.name ? <T size={12} muted style={{ marginTop: 1 }}>{meal.nameDe}</T> : null}
        <View style={{ marginTop: 8 }}>
          <MacroLine kcal={n.calories} protein={n.protein} />
        </View>
        {!preview && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={open ? 'Hide ingredients' : 'Show ingredients'}
            onPress={() => {
              tap();
              setOpen((o) => !o);
            }}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start' }}
          >
            <T size={13} weight="700" muted>{pm.items.length} ingredients</T>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
          </Pressable>
        )}
        {open && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {pm.items.map((it) => (
              <View key={it.key} style={{ backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4, flexDirection: 'row', gap: 4 }}>
                <T size={12} weight="700">{amountText(it.key, it.grams)}</T>
                <T size={12} muted>{it.key === 'egg' ? '' : shortName(it.key)}</T>
              </View>
            ))}
          </View>
        )}
        {!preview && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <PressScale
              accessibilityRole="button"
              accessibilityLabel={logged ? `${meal.name} logged today` : `Log ${meal.name}`}
              disabled={logged}
              onPress={onLog}
              scaleTo={0.97}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: logged ? colors.cardAlt : colors.primarySoft }}
            >
              <Ionicons name={logged ? 'checkmark-circle' : 'add-circle-outline'} size={17} color={logged ? colors.textMuted : colors.primary} />
              <T size={14} weight="700" color={logged ? colors.textMuted : colors.primary}>{logged ? 'Logged today' : 'Log this meal'}</T>
            </PressScale>
            <PressScale
              accessibilityRole="button"
              accessibilityLabel={`Swap ${meal.name}`}
              onPress={onSwap}
              scaleTo={0.97}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}
            >
              <Ionicons name="swap-horizontal" size={16} color={colors.text} />
              <T size={14} weight="700">Swap</T>
            </PressScale>
          </View>
        )}
      </View>
    </Card>
  );
}

/** Ingredient name without the preparation note ("Chicken breast, cooked" → "Chicken breast"). */
function shortName(key: string): string {
  const name = INGREDIENTS[key]?.name ?? key;
  return name.replace(/, (cooked|boiled|baked|drained|braised|lean, cooked|firm|raw)$/i, '').replace(/ in water, drained$/, '');
}

function WeekStrip({ plan, selected, onSelect }: { plan: MealPlanState; selected: number; onSelect: (i: number) => void }) {
  const { colors } = useTheme();
  const today = todayKey();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
      {plan.days.map((day, i) => {
        const date = addDays(plan.startDate, i);
        const d = fromKey(date);
        const active = i === selected;
        const ok = dayError(day, plan.calories, plan.protein) <= TOLERANCE;
        return (
          <Pressable
            key={date}
            accessibilityRole="button"
            accessibilityLabel={`${WEEKDAYS_LONG[d.getDay()]}${date === today ? ', today' : ''}`}
            accessibilityState={{ selected: active }}
            onPress={() => {
              tap();
              onSelect(i);
            }}
            style={{ width: 44, alignItems: 'center', paddingVertical: 8, borderRadius: 16, backgroundColor: active ? colors.ink : colors.card }}
          >
            <T size={11} weight="700" color={active ? colors.onInk : colors.textMuted}>{WEEKDAYS[d.getDay()]}</T>
            <T size={16} weight="800" color={active ? colors.onInk : date === today ? colors.primary : colors.text} style={{ marginTop: 2 }}>{d.getDate()}</T>
            <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 4, backgroundColor: ok ? (active ? colors.onInk : colors.primary) : colors.warning, opacity: ok ? 0.7 : 1 }} />
          </Pressable>
        );
      })}
    </View>
  );
}

function DaySummary({ plan, index }: { plan: MealPlanState; index: number }) {
  const { colors } = useTheme();
  const day = plan.days[index];
  const t = dayTotals(day);
  const date = addDays(plan.startDate, index);
  const d = fromKey(date);
  const err = dayError(day, plan.calories, plan.protein);
  const ok = err <= TOLERANCE;
  const row = (label: string, value: number, goal: number, unit: string, color: string) => (
    <View style={{ flex: 1 }}>
      <T size={12} muted weight="600">{label}</T>
      <T size={17} weight="800" style={{ marginTop: 2 }}>
        {fmt(value)}
        <T size={12} muted weight="600">{` / ${fmt(goal)} ${unit}`}</T>
      </T>
      <View style={{ marginTop: 6 }}>
        <ProgressBar value={value} max={goal} color={color} height={6} />
      </View>
    </View>
  );
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <T size={16} weight="800" style={{ flex: 1 }}>
          {WEEKDAYS_LONG[d.getDay()]}, {MONTH_NAMES[d.getMonth()].slice(0, 3)} {d.getDate()}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: ok ? colors.primarySoft : colors.warningSoft }}>
          <Ionicons name={ok ? 'checkmark' : 'alert'} size={12} color={ok ? colors.primary : colors.warning} />
          <T size={11} weight="800" color={ok ? colors.primary : colors.warning}>{ok ? 'On target' : `${Math.round(err * 100)} % off`}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        {row('Calories', t.calories, plan.calories, 'kcal', nutrientColors.calories)}
        {row('Protein', t.protein, plan.protein, 'g', nutrientColors.protein)}
      </View>
      <T size={12} muted style={{ marginTop: spacing.md }}>
        {fmt(t.carbs)} g carbs · {fmt(t.fat)} g fat · {fmt(t.fiber ?? 0)} g fiber
      </T>
    </Card>
  );
}

function DietChips({ value, onChange }: { value: MealDiet; onChange: (d: MealDiet) => void }) {
  return <ChoiceChips options={DIETS} value={value} onChange={onChange} />;
}

function ChoiceChips<K extends string>({ options, value, onChange }: { options: { key: K; label: string; icon?: string }[]; value: K; onChange: (k: K) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((d) => {
        const active = d.key === value;
        return (
          <Pressable
            key={d.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => {
              tap();
              onChange(d.key);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: active ? colors.ink : colors.cardAlt }}
          >
            {d.icon ? <Ionicons name={d.icon as IconName} size={14} color={active ? colors.onInk : colors.text} /> : null}
            <T size={13} weight="700" color={active ? colors.onInk : colors.text}>{d.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

interface PlanChoice {
  mode: PlanMode;
  style: PlanStyle;
  diet: MealDiet;
  favorites: string;
}

const listNames = (names: string[], max = 3) => names.slice(0, max).join(', ') + (names.length > max ? ` +${names.length - max} more` : '');

function FavoritesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const matches = useMemo(() => matchFavorites(value), [value]);
  const found = [...new Set(matches.flatMap((m) => m.mealIds.slice(0, 2)))].map((id) => findMeal(id)?.name).filter((n): n is string => !!n);
  const missing = matches.filter((m) => !m.mealIds.length).map((m) => m.favorite);
  return (
    <>
      <T size={15} weight="800" style={{ marginBottom: spacing.sm, marginTop: spacing.lg }}>Your favorite meals</T>
      <Field
        value={value}
        onChangeText={onChange}
        placeholder="Pasta, Döner, pancakes, chicken with rice"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={200}
        returnKeyType="done"
        accessibilityLabel="Your favorite meals"
        style={{ marginBottom: 6 }}
      />
      <T size={12} muted numberOfLines={2}>
        {!value.trim()
          ? 'Optional. We’ll plan more of what you like.'
          : found.length
            ? `Using: ${listNames(found)}${missing.length ? `. No match for ${listNames(missing, 2)}` : ''}`
            : 'No match in our recipes yet. Try another name.'}
      </T>
    </>
  );
}

function PlanChoices({ value, onChange }: { value: PlanChoice; onChange: (v: PlanChoice) => void }) {
  const style = PLAN_STYLES.find((x) => x.key === value.style);
  const mode = PLAN_MODES.find((x) => x.key === value.mode);
  return (
    <>
      <T size={15} weight="800" style={{ marginBottom: spacing.sm }}>How much variety?</T>
      <Segmented
        options={PLAN_MODES.map((m) => ({ key: m.key, label: m.label }))}
        value={value.mode}
        onChange={(mode) => {
          tap();
          onChange({ ...value, mode });
        }}
      />
      <T size={12} muted style={{ marginTop: 6, marginBottom: spacing.lg }}>{mode?.blurb}</T>
      <T size={15} weight="800" style={{ marginBottom: spacing.sm }}>Style</T>
      <ChoiceChips options={PLAN_STYLES} value={value.style} onChange={(s) => onChange({ ...value, style: s })} />
      <T size={12} muted style={{ marginTop: 6, marginBottom: spacing.lg }}>{style?.blurb}</T>
      <T size={15} weight="800" style={{ marginBottom: spacing.sm }}>What do you eat?</T>
      <DietChips value={value.diet} onChange={(d) => onChange({ ...value, diet: d })} />
      <FavoritesField value={value.favorites} onChange={(favorites) => onChange({ ...value, favorites })} />
    </>
  );
}

const choiceOf = (plan: MealPlanState): PlanChoice => ({ mode: plan.mode ?? 'varied', style: plan.style ?? 'mix', diet: plan.diet, favorites: plan.favorites ?? '' });

function PlanSummary({ plan, onPress }: { plan: MealPlanState; onPress: () => void }) {
  const { colors } = useTheme();
  const c = choiceOf(plan);
  const parts = [PLAN_MODES.find((m) => m.key === c.mode)?.label, PLAN_STYLES.find((x) => x.key === c.style)?.label, DIETS.find((d) => d.key === c.diet)?.label];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Plan settings"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md, opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name="options-outline" size={15} color={colors.textMuted} />
      <T size={13} weight="600" muted style={{ flex: 1 }} numberOfLines={1}>{parts.filter(Boolean).join(' · ')}</T>
      <T size={13} weight="700" color={colors.primary}>Change</T>
    </Pressable>
  );
}

function FavoritesLine({ plan }: { plan: MealPlanState }) {
  const { colors } = useTheme();
  if (!plan.favorites) return null;
  const used = plannedFavorites(plan).map((m) => m.name);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -spacing.sm, marginBottom: spacing.md }}>
      <Ionicons name="heart" size={14} color={used.length ? colors.primary : colors.textMuted} />
      <T size={12} muted numberOfLines={1} style={{ flex: 1 }}>
        {used.length ? `Using: ${listNames(used)}` : 'None of your favorites fit your goals this week.'}
      </T>
    </View>
  );
}

// ---------- shopping ----------

function CheckRow({ item, checked, onToggle }: { item: ShoppingItem; checked: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={item.name}
      onPress={onToggle}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: checked ? 0 : 1.5,
          borderColor: colors.textMuted,
          backgroundColor: checked ? colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={15} weight="600" color={checked ? colors.textMuted : colors.text} style={checked ? { textDecorationLine: 'line-through' } : undefined} numberOfLines={1}>
          {item.name}
        </T>
        {item.nameDe && item.nameDe !== item.name ? (
          <T size={12} muted numberOfLines={1}>{item.nameDe}</T>
        ) : null}
      </View>
      <T size={13} weight="700" color={colors.textMuted}>{shoppingAmount(item)}</T>
    </Pressable>
  );
}

function ShoppingTab({ plan }: { plan: MealPlanState }) {
  const { dispatch } = useStore();
  const { colors } = useTheme();
  const { days } = plan;
  const sections = useMemo(() => shoppingList({ days }), [days]);
  const all = sections.flatMap((s) => s.items);
  const checked = new Set(plan.checked);
  const done = all.filter((i) => checked.has(i.id)).length;
  return (
    <>
      <Card>
        <T size={16} weight="800">For {plan.days.length} days</T>
        <T size={12} muted style={{ marginBottom: spacing.md }}>
          {all.length} items{plan.mode === 'simple' ? ' · Simple plan' : ''} · as you buy them
        </T>
        <ProgressBar value={done} max={Math.max(1, all.length)} color={colors.primary} height={6} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <T size={12} muted weight="600" style={{ flex: 1 }}>{done === all.length && all.length ? 'All done. Enjoy the week!' : `${done} of ${all.length} in the basket`}</T>
          {done > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear ticks" onPress={() => dispatch({ type: 'setMealPlan', plan: { ...plan, checked: [] } })} hitSlop={10}>
              <T size={13} weight="700" color={colors.primary}>Clear</T>
            </Pressable>
          )}
        </View>
      </Card>
      {sections.map((s, si) => {
        const firstStaple = s.items.findIndex((i) => i.staple);
        return (
          <FadeIn key={s.aisle} delay={si * 50}>
            <Card style={{ paddingVertical: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                <IconTile icon={s.icon as IconName} color={colors.primary} size={30} />
                <T size={15} weight="800" style={{ flex: 1 }}>{s.label}</T>
                <T size={12} muted weight="700">{s.items.filter((i) => checked.has(i.id)).length}/{s.items.length}</T>
              </View>
              {s.items.map((it, i) => (
                <View key={it.id}>
                  {i === firstStaple && (
                    <T size={11} weight="800" muted style={{ letterSpacing: 0.8, marginTop: 10 }}>PROBABLY AT HOME</T>
                  )}
                  {i > 0 && i !== firstStaple && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 34 }} />}
                  <CheckRow
                    item={it}
                    checked={checked.has(it.id)}
                    onToggle={() => {
                      tap();
                      dispatch({ type: 'toggleShoppingItem', id: it.id });
                    }}
                  />
                </View>
              ))}
            </Card>
          </FadeIn>
        );
      })}
    </>
  );
}

// ---------- locked preview (free) ----------

/** The sample day only shows meals; its date is never displayed. */
const PREVIEW_START = '2026-01-05';

function LockedPreview() {
  const { colors } = useTheme();
  const { calories, protein } = useGoals();
  const goals = { calories, protein };
  const sample = generateMealPlan({ calories, protein, seed: 'preview', startDate: PREVIEW_START, days: 1 });
  const perks: { icon: IconName; text: string }[] = [
    { icon: 'scale-outline', text: 'Portions in grams, scaled to your goals' },
    { icon: 'sparkles-outline', text: 'Famous styles, simple or varied weeks' },
    { icon: 'swap-horizontal', text: 'Swap any meal, the day stays on target' },
    { icon: 'cart-outline', text: 'A shopping list sorted by aisle' },
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      <FadeIn>
        <T size={26} weight="800" style={{ marginBottom: 6 }}>Your week of meals, planned</T>
        <T size={15} muted style={{ marginBottom: spacing.lg }}>
          Seven days of breakfasts, lunches, dinners and snacks within 5 % of your {fmt(goals.calories)} kcal and {fmt(goals.protein)} g protein, with everything you need to buy.
        </T>
        <Card>
          {perks.map((p, i) => (
            <View key={p.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: i ? spacing.md : 0 }}>
              <IconTile icon={p.icon} color={colors.primary} size={34} />
              <T size={14} weight="600" style={{ flex: 1 }}>{p.text}</T>
            </View>
          ))}
        </Card>
      </FadeIn>
      <FadeIn delay={120}>
        <T size={12} weight="800" muted style={{ letterSpacing: 0.8, marginTop: spacing.md, marginBottom: spacing.sm }}>A DAY FROM YOUR PLAN</T>
        <View pointerEvents="none" style={{ opacity: 0.9 }}>
          {sample.days[0]?.meals.slice(0, 2).map((pm, i) => (
            <MealBlock key={i} pm={pm} preview />
          ))}
          <LinearGradient
            colors={[colors.background + '00', colors.background + 'E6', colors.background]}
            locations={[0, 0.6, 1]}
            style={{ position: 'absolute', left: -2, right: -2, bottom: 0, height: 240 }}
          />
        </View>
      </FadeIn>
    </ScrollView>
  );
}

// ---------- screen ----------

export default function MealPlanScreen() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pro = isPro(state);
  const goals = useGoals();
  const plan = state.mealPlan;
  const today = todayKey();
  const [tab, setTab] = useState<'meals' | 'shop'>('meals');
  const [choice, setChoice] = useState<PlanChoice>(() => (plan ? choiceOf(plan) : { mode: 'simple', style: 'mix', diet: defaultDiet(state), favorites: '' }));
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(false);
  const todayIndex = plan ? Math.round((fromKey(today).getTime() - fromKey(plan.startDate).getTime()) / 86400000) : -1;
  const [selected, setSelected] = useState(() => (todayIndex >= 0 && todayIndex < (plan?.days.length ?? 0) ? todayIndex : 0));
  const [swap, setSwap] = useState<{ day: number; meal: number } | null>(null);

  const make = async (c: PlanChoice = choice) => {
    if (busy) return;
    setChoice(c);
    const favorites = c.favorites.trim();
    let favoriteIds: string[] | undefined;
    if (favorites && plan?.favorites === favorites && plan.diet === c.diet && plan.favoriteIds) favoriteIds = plan.favoriteIds;
    else if (favorites) {
      setBusy(true);
      favoriteIds = await resolveFavoriteIds(favorites, c.diet);
      setBusy(false);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const next = generateMealPlan({ ...goals, ...c, favorites, favoriteIds, seed: newSeed(), startDate: today });
    dispatch({ type: 'setMealPlan', plan: next });
    setSelected(0);
    setSettings(false);
    setTab('meals');
  };

  const loggedIds = useMemo(() => new Set(state.entries.filter((e) => e.date === today).map((e) => e.food.id)), [state.entries, today]);

  if (!pro) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header />
        <LockedPreview />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, backgroundColor: colors.background }}>
          <Button title="Unlock meal plans" pro onPress={() => router.push({ pathname: '/pro', params: { feature: 'mealplan' } })} />
          <T size={12} muted center style={{ marginTop: 8 }}>Part of Fitness Buddy Pro</T>
        </View>
      </View>
    );
  }

  if (!plan || !plan.days.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header />
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + 40 }}>
          <FadeIn>
            <T size={26} weight="800" style={{ marginBottom: 6 }}>Plan your week</T>
            <T size={15} muted style={{ marginBottom: spacing.lg }}>
              Everyday supermarket food, portioned to hit {fmt(goals.calories)} kcal and {fmt(goals.protein)} g protein a day.
            </T>
            <Card>
              <PlanChoices value={choice} onChange={setChoice} />
            </Card>
            <Button title={busy ? 'Matching your favorites…' : 'Create my plan'} icon="sparkles" disabled={busy} onPress={() => make()} style={{ marginTop: spacing.sm }} />
            <T size={12} muted center style={{ marginTop: spacing.md }}>Works offline. You can swap any meal later.</T>
          </FadeIn>
        </ScrollView>
      </View>
    );
  }

  const day: PlanDay | undefined = plan.days[Math.min(selected, plan.days.length - 1)];
  const goalsChanged = plan.calories !== goals.calories || plan.protein !== goals.protein;
  const ended = todayIndex >= plan.days.length;
  const offDays = plan.days.filter((d) => dayError(d, plan.calories, plan.protein) > TOLERANCE).length;

  const log = (pm: PlannedMeal) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    dispatch({ type: 'addEntries', entries: [plannedEntry(pm, today)] });
  };

  const options = swap ? swapOptions(plan, swap.day, swap.meal) : [];
  const openSettings = () => {
    setChoice(choiceOf(plan));
    setSettings(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header right={<IconButton label="Plan settings" icon="options-outline" color={colors.text} onPress={() => openSettings()} />} />
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Segmented
          options={[
            { key: 'meals', label: 'Meals' },
            { key: 'shop', label: 'Shopping list' },
          ]}
          value={tab}
          onChange={(k) => {
            tap();
            setTab(k);
          }}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {(goalsChanged || ended) && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.infoSoft }}>
            <Ionicons name={ended ? 'calendar-outline' : 'options-outline'} size={20} color={colors.info} />
            <T size={13} weight="600" style={{ flex: 1 }}>
              {ended ? 'This plan has run its week. Ready for the next one?' : `Your goals changed to ${fmt(goals.calories)} kcal and ${fmt(goals.protein)} g protein.`}
            </T>
            <Button small title={ended ? 'New week' : 'Update'} variant="secondary" onPress={() => make(choiceOf(plan))} />
          </Card>
        )}

        {tab === 'meals' && day ? (
          <>
            <PlanSummary plan={plan} onPress={openSettings} />
            <FavoritesLine plan={plan} />
            <WeekStrip plan={plan} selected={selected} onSelect={setSelected} />
            <FadeIn key={`sum-${selected}-${plan.seed}`} offset={6}>
              <DaySummary plan={plan} index={selected} />
            </FadeIn>
            {day.meals.map((pm, i) => (
              <FadeIn key={`${selected}-${i}-${pm.mealId}`} delay={60 + i * 50} offset={10}>
                <MealBlock pm={pm} logged={loggedIds.has(plannedMealFood(pm).id)} onLog={() => log(pm)} onSwap={() => setSwap({ day: selected, meal: i })} />
              </FadeIn>
            ))}

            {offDays > 0 && (
              <T size={12} color={colors.warning} weight="600" style={{ marginVertical: spacing.sm }}>
                {offDays === 1 ? 'One day' : `${offDays} days`} couldn’t quite reach your goals with {DIETS.find((x) => x.key === plan.diet)?.label.toLowerCase()} meals, so we got as close as we could.
              </T>
            )}
            <Button title="Make a new plan" icon="refresh" variant="secondary" disabled={busy} onPress={() => make(choiceOf(plan))} style={{ marginTop: spacing.sm }} />
          </>
        ) : null}

        {tab === 'shop' && <ShoppingTab plan={plan} />}
        {tab !== 'shop' && Object.keys(MEAL_PHOTOS).length > 0 ? (
          <T size={11} muted center onPress={() => router.push('/photo-credits' as never)} style={{ marginTop: spacing.lg }}>
            Photos: Flickr photographers, CC BY. See credits
          </T>
        ) : null}
      </ScrollView>

      <Sheet visible={!!swap} onClose={() => setSwap(null)} title={swap ? `Swap ${slotLabel(plan.days[swap.day].meals[swap.meal].slot).toLowerCase()}` : undefined}>
        {swap && (
          <>
            <T size={13} muted style={{ marginBottom: spacing.sm }}>
              {plan.mode === 'simple' ? 'Changes it on every day it’s planned. Portions adjust to stay on target.' : 'The rest of the day is re-portioned so it stays on target.'}
            </T>
            {options.length ? (
              options.map((d) => {
                const pm = d.meals[swap.meal];
                const m = findMeal(pm.mealId)!;
                const n = itemsNutrients(pm.items);
                return (
                  <PressScale
                    key={pm.mealId}
                    scaleTo={0.98}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${m.name}`}
                    onPress={() => {
                      tap();
                      dispatch({ type: 'setMealPlan', plan: applySwap(plan, swap.day, swap.meal, d) });
                      setSwap(null);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                  >
                    <MealImage mealId={pm.mealId} width={56} aspectRatio={1} rounded={radius.md} iconSize={18} />
                    <View style={{ flex: 1 }}>
                      <T size={15} weight="700">{m.name}</T>
                      <T size={12} muted style={{ marginBottom: 4 }}>{m.nameDe}</T>
                      <MacroLine kcal={n.calories} protein={n.protein} muted />
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </PressScale>
                );
              })
            ) : (
              <T size={14} muted style={{ paddingVertical: spacing.lg }}>No other meal keeps this day on target. Try a new plan instead.</T>
            )}
          </>
        )}
      </Sheet>

      <Sheet visible={settings} onClose={() => setSettings(false)} title="Plan settings">
        <PlanChoices value={choice} onChange={setChoice} />
        <Button
          title={busy ? 'Matching your favorites…' : 'Make a new plan'}
          icon="sparkles"
          disabled={busy}
          onPress={() => make(choice)}
          style={{ marginTop: spacing.xl }}
        />
      </Sheet>
    </View>
  );
}
