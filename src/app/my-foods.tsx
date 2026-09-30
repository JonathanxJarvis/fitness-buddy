import React, { useState } from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ActionSheet, Button, Card, EmptyState, IconButton, Screen, Segmented, T } from '@/components/ui';
import { FoodRow, MealThumb } from '@/components/FoodThumb';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { cacheFood } from '@/store/session';
import { mealItemsToLog, sumItems } from '@/lib/nutrition';
import { prettyDate } from '@/lib/dates';
import { MEALS, type SavedMeal } from '@/lib/types';
import { spacing, useTheme } from '@/theme';

type Tab = 'meals' | 'favorites' | 'mine';

export default function MealsScreen() {
  const { state, dispatch, selectedDate } = useStore();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('meals');

  const [logging, setLogging] = useState<SavedMeal | null>(null);

  const logMeal = (m: SavedMeal, meal: (typeof MEALS)[number]['key']) => {
    const now = Date.now();
    dispatch({
      type: 'addEntries',
      entries: mealItemsToLog(m).map((it, i) => ({ id: uid() + i, date: selectedDate, meal, ...it, createdAt: now + i })),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton
              filled
              label={tab === 'meals' ? 'New saved meal' : 'New custom food'}
              icon="add"
              onPress={() => router.push(tab === 'meals' ? '/meal-builder' : '/custom-food')}
            />
          ),
        }}
      />
      <ActionSheet
        visible={!!logging}
        onClose={() => setLogging(null)}
        title={logging ? `Log “${logging.name}” ${prettyDate(selectedDate).toLowerCase()} as…` : undefined}
        actions={MEALS.map((meal) => ({ label: meal.label, icon: meal.icon as never, onPress: () => logging && logMeal(logging, meal.key) }))}
      />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { key: 'meals', label: 'Meals & recipes' },
          { key: 'favorites', label: 'Favorites' },
          { key: 'mine', label: 'Custom' },
        ]}
        style={{ marginBottom: spacing.lg }}
      />

      {tab === 'meals' && (
        <>
          {state.savedMeals.length === 0 ? (
            <Card>
              <EmptyState
                icon="bookmark-outline"
                title="Save meals you eat often"
                body="Group foods into a meal you can re-log in one tap, or build a recipe and log it by the portion."
              />
              <Button title="Create a saved meal" icon="add" onPress={() => router.push('/meal-builder')} />
            </Card>
          ) : (
            <Card>
              {state.savedMeals.map((m) => {
                const n = sumItems(mealItemsToLog(m));
                return (
                  <FoodRow
                    key={m.id}
                    thumb={<MealThumb meal={m} />}
                    title={m.name}
                    subtitle={`${Math.round(n.calories)} kcal · ${m.isRecipe ? `recipe, ${m.servings} portions` : `${m.items.length} foods`}`}
                    onPress={() => router.push({ pathname: '/meal-builder', params: { editId: m.id } })}
                    right={<Button small title="Log" icon="add" onPress={() => setLogging(m)} />}
                  />
                );
              })}
            </Card>
          )}
          <T muted size={13} center>Tip: on the Today screen, tap a meal’s + and choose “Save as meal”.</T>
        </>
      )}

      {tab === 'favorites' && (
        <Card>
          {state.favorites.length === 0 ? (
            <EmptyState icon="heart-outline" title="No favorites yet" body="Tap the heart on any food’s details to pin it here." />
          ) : (
            state.favorites.map((f) => (
              <FoodRow
                key={f.id}
                food={f}
                title={f.name}
                subtitle={`${f.brand ? f.brand + ' · ' : ''}${Math.round(f.nutrients.calories)} kcal · ${f.servings[0].label}`}
                onPress={() => router.push({ pathname: '/food', params: { foodId: cacheFood(f), date: selectedDate } })}
                right={<IconButton label="Remove favorite" icon="heart" color={colors.danger} onPress={() => dispatch({ type: 'toggleFavorite', food: f })} />}
              />
            ))
          )}
        </Card>
      )}

      {tab === 'mine' && (
        <Card>
          {state.customFoods.length === 0 ? (
            <EmptyState icon="create-outline" title="No custom foods" body="Add foods that aren’t in the database, like home cooking or local brands." />
          ) : (
            state.customFoods.map((f) => (
              <FoodRow
                key={f.id}
                food={f}
                title={f.name}
                subtitle={`${Math.round(f.nutrients.calories)} kcal · ${f.servings[0].label}${f.barcode ? ' · barcode linked' : ''}`}
                onPress={() => router.push({ pathname: '/custom-food', params: { editId: f.id } })}
                right={<IconButton filled label={`Log ${f.name}`} icon="add" onPress={() => router.push({ pathname: '/food', params: { foodId: f.id, date: selectedDate } })} />}
              />
            ))
          )}
        </Card>
      )}
    </Screen>
  );
}
