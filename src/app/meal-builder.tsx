import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Button, Card, EmptyState, Field, IconButton, Screen, Segmented, Stepper, T } from '@/components/ui';
import { FoodRow } from '@/components/FoodThumb';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { mealDraft, useMealDraft } from '@/store/session';
import { itemNutrients, scaleNutrients, servingText, sumItems } from '@/lib/nutrition';
import { MEALS } from '@/lib/types';
import { spacing, useTheme } from '@/theme';

export default function MealBuilder() {
  const params = useLocalSearchParams<{ editId?: string; fromDate?: string; fromMeal?: string }>();
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const editing = params.editId ? state.savedMeals.find((m) => m.id === params.editId) : undefined;
  const items = useMealDraft();

  const defaultName = params.fromMeal ? `My ${MEALS.find((m) => m.key === params.fromMeal)?.label.toLowerCase() ?? 'meal'}` : '';
  const [name, setName] = useState(editing?.name ?? defaultName);
  const [kind, setKind] = useState<'meal' | 'recipe'>(editing?.isRecipe ? 'recipe' : 'meal');
  const [servings, setServings] = useState(editing?.servings ?? 4);

  // Seed the draft once when the screen opens.
  useEffect(() => {
    if (editing) mealDraft.set(editing.items);
    else if (params.fromDate && params.fromMeal) {
      mealDraft.set(
        state.entries
          .filter((e) => e.date === params.fromDate && e.meal === params.fromMeal)
          .map(({ food, servingIndex, quantity }) => ({ food, servingIndex, quantity })),
      );
    } else mealDraft.set([]);
    return () => mealDraft.set([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = sumItems(items);
  const isRecipe = kind === 'recipe';
  const shown = isRecipe ? scaleNutrients(total, 1 / Math.max(1, servings)) : total;
  const valid = name.trim().length > 0 && items.length > 0;

  const save = () => {
    if (!valid) return;
    dispatch({
      type: 'saveMeal',
      meal: {
        id: editing?.id ?? uid(),
        name: name.trim(),
        items,
        isRecipe,
        servings: isRecipe ? Math.max(1, servings) : 1,
        createdAt: editing?.createdAt ?? Date.now(),
      },
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Stack.Screen options={{ title: editing ? 'Edit saved meal' : 'New saved meal' }} />
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { key: 'meal', label: 'Meal (log all items)' },
            { key: 'recipe', label: 'Recipe (log portions)' },
          ]}
          style={{ marginBottom: spacing.lg }}
        />
        <Field label="Name" value={name} onChangeText={setName} placeholder={isRecipe ? 'e.g. Turkey chili' : 'e.g. Usual breakfast'} />
        {isRecipe && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <T weight="700">Makes how many portions?</T>
            <Stepper value={servings} onChange={(n) => setServings(Math.max(1, Math.round(n)))} min={1} />
          </View>
        )}

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T weight="700" size={16}>{isRecipe ? 'Ingredients' : 'Foods'}</T>
            <IconButton filled label="Add food" icon="add" onPress={() => router.push({ pathname: '/add-food', params: { target: 'builder' } })} />
          </View>
          {items.length === 0 && <EmptyState icon="restaurant-outline" title="No foods yet" body="Tap + to search, scan or pick from your recent foods." />}
          {items.map((it, i) => (
            <FoodRow
              key={`${it.food.id}-${i}`}
              food={it.food}
              title={it.food.name}
              subtitle={servingText(it)}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <T weight="700">{Math.round(itemNutrients(it).calories)}</T>
                  <IconButton label={`Remove ${it.food.name}`} icon="close-circle" color={colors.textMuted} onPress={() => mealDraft.removeAt(i)} />
                </View>
              }
            />
          ))}
        </Card>

        <Card>
          <T muted size={13}>{isRecipe ? 'Per portion' : 'Total'}</T>
          <T size={28} weight="800" color={colors.primary}>{Math.round(shown.calories)} kcal</T>
          <T muted>
            P {Math.round(shown.protein)} g · C {Math.round(shown.carbs)} g · F {Math.round(shown.fat)} g
          </T>
        </Card>

        <Button title="Save" icon="bookmark" disabled={!valid} onPress={save} />
        {editing && (
          <Button
            title="Delete"
            variant="danger"
            style={{ marginTop: spacing.md }}
            onPress={() => {
              dispatch({ type: 'deleteMeal', id: editing.id });
              router.back();
            }}
          />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
