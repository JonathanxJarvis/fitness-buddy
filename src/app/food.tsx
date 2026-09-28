import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Button, Card, Chip, EmptyState, IconButton, Screen, Stepper, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { getCachedFood, mealDraft } from '@/store/session';
import { BUILTIN_FOODS } from '@/lib/foodDatabase';
import { itemNutrients, NUTRIENT_INFO } from '@/lib/nutrition';
import { todayKey } from '@/lib/dates';
import { nutrientColors, spacing, useTheme } from '@/theme';
import { MEALS, type Food, type MealType, type NutrientKey } from '@/lib/types';

const MICROS: NutrientKey[] = ['fiber', 'sugar', 'sodium', 'potassium', 'calcium', 'iron', 'vitaminC', 'vitaminD'];

function fmt(n: number) {
  return n >= 100 ? String(Math.round(n)) : n >= 10 ? n.toFixed(1).replace(/\.0$/, '') : n.toFixed(1).replace(/\.0$/, '');
}

export default function FoodDetail() {
  const params = useLocalSearchParams<{ foodId?: string; entryId?: string; meal?: MealType; date?: string; target?: string }>();
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
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
      BUILTIN_FOODS.find((f) => f.id === id)
    );
  }, [entry, params.foodId, state]);

  const [servingIndex, setServingIndex] = useState(entry?.servingIndex ?? 0);
  const [quantity, setQuantity] = useState(entry?.quantity ?? 1);
  const [meal, setMeal] = useState<MealType>(entry?.meal ?? params.meal ?? 'snacks');

  if (!food) {
    return (
      <Screen>
        <EmptyState icon="help-circle-outline" title="Food not found" />
      </Screen>
    );
  }

  const isFav = state.favorites.some((f) => f.id === food.id);
  const n = itemNutrients({ food, servingIndex, quantity });
  const macroCals = n.protein * 4 + n.carbs * 4 + n.fat * 9 || 1;

  const save = () => {
    if (quantity <= 0) return;
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
        entries: [{ id: uid(), date: params.date ?? todayKey(), meal, food, servingIndex, quantity, createdAt: Date.now() }],
      });
    }
    router.dismissTo('/');
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: entry ? 'Edit entry' : 'Add food',
          headerRight: () => (
            <IconButton
              label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              icon={isFav ? 'heart' : 'heart-outline'}
              color={isFav ? colors.danger : colors.primary}
              onPress={() => dispatch({ type: 'toggleFavorite', food })}
            />
          ),
        }}
      />
      <T size={24} weight="800">{food.name}</T>
      {food.brand ? <T muted style={{ marginTop: 2 }}>{food.brand}</T> : null}
      <T muted size={12} style={{ marginTop: 4 }}>
        {food.source === 'openfoodfacts' ? 'From Open Food Facts' : food.source === 'custom' ? 'Your custom food' : food.source === 'recipe' ? 'Your recipe' : 'Common food'}
        {food.barcode ? ` · ${food.barcode}` : ''}
      </T>

      <Card style={{ marginTop: spacing.lg }}>
        <T weight="700" style={{ marginBottom: spacing.sm }}>Serving size</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {food.servings.map((s, i) => (
            <Chip
              key={s.label}
              label={s.label}
              active={i === servingIndex}
              onPress={() => {
                // Keep roughly the same amount when switching to a gram/ounce unit.
                const cur = food.servings[servingIndex].factor * quantity;
                setServingIndex(i);
                if (/^1 (g|oz)$/.test(s.label)) setQuantity(Math.round(cur / s.factor));
                else if (i !== servingIndex) setQuantity(1);
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
          <T weight="700">Amount</T>
          <Stepper value={quantity} onChange={setQuantity} step={/^1 (g|oz)$/.test(food.servings[servingIndex].label) ? 10 : 0.5} />
        </View>
        {!forBuilder && (
          <>
            <T weight="700" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Meal</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {MEALS.map((m) => (
                <Chip key={m.key} label={m.label} active={meal === m.key} onPress={() => setMeal(m.key)} />
              ))}
            </View>
          </>
        )}
      </Card>

      <Card>
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <T size={40} weight="800" color={colors.primary}>{Math.round(n.calories)}</T>
          <T muted>calories</T>
        </View>
        <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: spacing.md }}>
          <View style={{ flex: (n.protein * 4) / macroCals, backgroundColor: nutrientColors.protein }} />
          <View style={{ flex: (n.carbs * 4) / macroCals, backgroundColor: nutrientColors.carbs }} />
          <View style={{ flex: (n.fat * 9) / macroCals, backgroundColor: nutrientColors.fat }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {([['Protein', n.protein, nutrientColors.protein], ['Carbs', n.carbs, nutrientColors.carbs], ['Fat', n.fat, nutrientColors.fat]] as const).map(([l, v, c]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <T size={18} weight="800" color={c}>{fmt(v)} g</T>
              <T muted size={13}>{l}</T>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <T weight="700" style={{ marginBottom: spacing.sm }}>Nutrition details</T>
        {MICROS.map((k) => {
          const v = n[k];
          const info = NUTRIENT_INFO[k];
          return (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <T muted>{info.label}</T>
              <T weight="600">{v === undefined ? '—' : `${fmt(v)} ${info.unit}`}</T>
            </View>
          );
        })}
      </Card>

      <Button title={forBuilder ? 'Add to saved meal' : entry ? 'Save changes' : 'Add to diary'} icon="checkmark" onPress={save} disabled={quantity <= 0} />
      {entry && (
        <Button
          title="Delete entry"
          variant="danger"
          style={{ marginTop: spacing.md }}
          onPress={() => {
            dispatch({ type: 'deleteEntry', id: entry.id });
            router.back();
          }}
        />
      )}
    </Screen>
  );
}
