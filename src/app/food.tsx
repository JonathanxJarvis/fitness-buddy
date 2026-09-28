import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Badge, Button, Card, Chip, CountUp, EmptyState, IconTile, Screen, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { HealthScoreCard } from '@/components/HealthScore';
import { PortionPicker } from '@/components/PortionPicker';
import { gramServingIndex } from '@/lib/portion';
import { FoodHeroArt, clockTime } from '@/components/FoodThumb';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { getCachedFood, mealDraft } from '@/store/session';
import { BUILTIN_FOODS } from '@/lib/foodDatabase';
import { GERMAN_FOODS } from '@/lib/germanFoods';
import { healthScore, itemNutrients, NUTRIENT_INFO } from '@/lib/nutrition';
import { prettyDate, todayKey } from '@/lib/dates';
import { nutrientColors, spacing, useTheme } from '@/theme';
import { MEALS, type Food, type MealType, type NutrientKey } from '@/lib/types';

const MICROS: NutrientKey[] = ['fiber', 'sugar', 'sodium', 'potassium', 'calcium', 'iron', 'vitaminC', 'vitaminD'];

const SOURCE_LABEL: Record<Food['source'], string> = {
  builtin: 'Common food',
  openfoodfacts: 'Open Food Facts',
  usda: 'USDA FoodData Central',
  custom: 'Your custom food',
  recipe: 'Your recipe',
  ai: 'AI photo estimate',
};

function fmt(n: number) {
  return n >= 100 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, '');
}

function Tile({ icon, label, value, unit, color, delay }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: number; unit: string; color: string; delay: number }) {
  const { colors } = useTheme();
  return (
    <FadeIn delay={delay} style={{ width: '48%', marginBottom: spacing.md }}>
      <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border }}>
        <IconTile icon={icon} color={color} size={38} />
        <View style={{ flex: 1 }}>
          <T size={12} muted weight="600">{label}</T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <CountUp value={value} size={19} weight="800" delay={delay} />
            <T size={12} muted weight="600">{unit}</T>
          </View>
        </View>
      </View>
    </FadeIn>
  );
}

export default function FoodDetail() {
  const params = useLocalSearchParams<{ foodId?: string; entryId?: string; meal?: MealType; date?: string; target?: string }>();
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const entry = params.entryId ? state.entries.find((e) => e.id === params.entryId) : undefined;
  const forBuilder = params.target === 'builder';

  const food: Food | undefined = useMemo(() => {
    if (entry) return entry.food;
    const id = params.foodId;
    if (!id) return undefined;
    return (
      getCachedFood(id) ??
      state.customFoods.find((f) => f.id === id) ??
      state.favorites.find((f) => f.id === id) ??
      state.entries.find((e) => e.food.id === id)?.food ??
      BUILTIN_FOODS.find((f) => f.id === id) ??
      GERMAN_FOODS.find((f) => f.id === id)
    );
  }, [entry, params.foodId, state]);

  // Foods measured per 100 g open in grams so you can type what the scale says.
  const startInGrams = !entry && food?.servings[0]?.label === '100 g' && gramServingIndex(food) >= 0;
  const [servingIndex, setServingIndex] = useState(entry?.servingIndex ?? (startInGrams && food ? gramServingIndex(food) : 0));
  const [quantity, setQuantity] = useState(entry?.quantity ?? (startInGrams ? 100 : 1));
  const [meal, setMeal] = useState<MealType>(entry?.meal ?? (MEALS.find((m) => m.key === params.meal)?.key || 'snacks'));

  if (!food) {
    return (
      <Screen topInset>
        <EmptyState icon="help-circle-outline" title="Food not found" />
        <Button title="Close" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const isFav = state.favorites.some((f) => f.id === food.id);
  const n = itemNutrients({ food, servingIndex, quantity });
  const score = healthScore(n);
  const macroCals = n.protein * 4 + n.carbs * 4 + n.fat * 9 || 1;
  const date = entry?.date ?? params.date ?? todayKey();
  const when = entry ? `${prettyDate(entry.date)} at ${clockTime(entry.createdAt)}` : prettyDate(date);

  const save = () => {
    if (quantity <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (forBuilder) {
      mealDraft.add({ food, servingIndex, quantity });
      router.dismissTo('/meal-builder');
      return;
    }
    if (entry) {
      dispatch({ type: 'updateEntry', entry: { ...entry, servingIndex, quantity, meal } });
    } else {
      dispatch({
        type: 'addEntries',
        entries: [{ id: uid(), date, meal, food, servingIndex, quantity, createdAt: Date.now() }],
      });
    }
    router.dismissTo('/');
  };

  const roundBtn = (icon: React.ComponentProps<typeof Ionicons>['name'], label: string, onPress: () => void, color = '#fff') => (
    <PressScale accessibilityLabel={label} onPress={onPress} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={21} color={color} />
    </PressScale>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <View style={{ height: entry?.photo ? 300 : 230 }}>
          {entry?.photo ? (
            <Image source={{ uri: entry.photo }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <LinearGradient colors={colors.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.05)', top: -100, right: -80 }} />
              <FadeIn offset={14} style={{ marginTop: insets.top }}>
                <View style={{ padding: 6, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.14)', transform: [{ rotate: '-4deg' }] }}>
                  <FoodHeroArt food={food} size={100} />
                </View>
              </FadeIn>
            </LinearGradient>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }} />
          <View style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.lg, right: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' }}>
            {roundBtn('chevron-back', 'Back', () => router.back())}
            {roundBtn(isFav ? 'heart' : 'heart-outline', isFav ? 'Remove from favorites' : 'Add to favorites', () => {
              Haptics.selectionAsync().catch(() => {});
              dispatch({ type: 'toggleFavorite', food });
            }, isFav ? '#FF7A8A' : '#fff')}
          </View>
        </View>

        <View style={{ marginTop: -28, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg }}>
          <FadeIn>
            <T size={25} weight="800">{food.name}</T>
            {food.brand ? <T muted style={{ marginTop: 2 }}>{food.brand}</T> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm, flexWrap: 'wrap' }}>
              <T size={13} muted>{when}</T>
              {!forBuilder && <Badge label={MEALS.find((m) => m.key === meal)!.label.toUpperCase()} color={colors.primary} />}
              {food.source === 'ai' && <Badge label="AI" color={nutrientColors.protein} icon="sparkles" />}
            </View>
          </FadeIn>

          <T size={17} weight="800" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>Nutritional breakdown</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <Tile icon="flame" label="Calories" value={Math.round(n.calories)} unit="kcal" color={nutrientColors.calories} delay={40} />
            <Tile icon="barbell" label="Protein" value={Math.round(n.protein)} unit="g" color={nutrientColors.protein} delay={90} />
            <Tile icon="flash" label="Carbs" value={Math.round(n.carbs)} unit="g" color={nutrientColors.carbs} delay={140} />
            <Tile icon="water" label="Fat" value={Math.round(n.fat)} unit="g" color={nutrientColors.fat} delay={190} />
          </View>
          <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.lg, gap: 2 }}>
            <View style={{ flex: (n.protein * 4) / macroCals || 0.001, backgroundColor: nutrientColors.protein }} />
            <View style={{ flex: (n.carbs * 4) / macroCals || 0.001, backgroundColor: nutrientColors.carbs }} />
            <View style={{ flex: (n.fat * 9) / macroCals || 0.001, backgroundColor: nutrientColors.fat }} />
          </View>

          <Card>
            <T weight="800" style={{ marginBottom: spacing.sm }}>How much?</T>
            <PortionPicker
              food={food}
              servingIndex={servingIndex}
              quantity={quantity}
              onChange={(i, q) => {
                setServingIndex(i);
                setQuantity(q);
              }}
            />
            {!forBuilder && (
              <>
                <T weight="800" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Meal</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {MEALS.map((m) => (
                    <Chip key={m.key} label={m.label} active={meal === m.key} onPress={() => setMeal(m.key)} />
                  ))}
                </View>
              </>
            )}
          </Card>

          {score && <HealthScoreCard score={score} />}

          {food.components?.length ? (
            <Card>
              <T weight="800" style={{ marginBottom: spacing.sm }}>What’s on the plate</T>
              {food.components.map((c, i) => {
                const f = (food.servings[servingIndex]?.factor ?? 1) * quantity;
                return (
                  <View key={c.name + i} style={{ flexDirection: 'row', paddingVertical: 6 }}>
                    <T style={{ flex: 1 }}>{c.name} <T size={12} muted>~{Math.round(c.grams * f)} g</T></T>
                    <T weight="700">{Math.round(c.calories * f)} kcal</T>
                  </View>
                );
              })}
              {food.note ? <T size={12} muted style={{ marginTop: 6 }}>{food.note}</T> : null}
            </Card>
          ) : null}

          <Card>
            <T weight="800" style={{ marginBottom: spacing.sm }}>Vitamins & minerals</T>
            {MICROS.map((k) => {
              const v = n[k];
              const info = NUTRIENT_INFO[k];
              return (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <T muted>{info.label}</T>
                  <T weight="700">{v === undefined ? '—' : `${fmt(v)} ${info.unit}`}</T>
                </View>
              );
            })}
            <T size={12} muted style={{ marginTop: spacing.sm }}>
              Source: {SOURCE_LABEL[food.source]}
              {food.barcode ? ` · ${food.barcode}` : ''}
            </T>
          </Card>

          {entry && (
            <Pressable
              onPress={() => {
                dispatch({ type: 'deleteEntry', id: entry.id });
                router.back();
              }}
              style={{ alignItems: 'center', paddingVertical: spacing.md }}
            >
              <T weight="700" color={colors.danger}>Delete entry</T>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button
          title={forBuilder ? 'Add to saved meal' : entry ? 'Save changes' : `Add meal · ${Math.round(n.calories)} kcal`}
          icon={entry ? 'checkmark' : 'add-circle'}
          onPress={save}
          disabled={quantity <= 0}
        />
      </View>
    </View>
  );
}
