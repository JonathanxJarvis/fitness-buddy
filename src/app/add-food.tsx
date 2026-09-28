import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button, EmptyState, Field, IconButton, ListRow, Segmented, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { recentFoods, uid } from '@/store/reducer';
import { cacheFood, mealDraft } from '@/store/session';
import { BUILTIN_FOODS, searchLocal } from '@/lib/foodDatabase';
import { searchFoods } from '@/lib/openFoodFacts';
import { mealItemsToLog, sumItems } from '@/lib/nutrition';
import { todayKey } from '@/lib/dates';
import { spacing, useTheme } from '@/theme';
import { MEALS, type Food, type MealType, type SavedMeal } from '@/lib/types';

type Tab = 'recent' | 'favorites' | 'mine' | 'meals';

export default function AddFood() {
  const params = useLocalSearchParams<{ meal?: MealType; date?: string; target?: string }>();
  const meal = (params.meal ?? 'snacks') as MealType;
  const date = params.date ?? todayKey();
  const forBuilder = params.target === 'builder';
  const { state, dispatch } = useStore();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('recent');
  const [online, setOnline] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const recents = useMemo(() => recentFoods(state.entries), [state.entries]);
  const localPool = useMemo(() => {
    const byId = new Map<string, Food>();
    for (const f of [...state.customFoods, ...state.favorites, ...recents, ...BUILTIN_FOODS]) if (!byId.has(f.id)) byId.set(f.id, f);
    return [...byId.values()];
  }, [state.customFoods, state.favorites, recents]);
  const localResults = useMemo(() => searchLocal(localPool, query).slice(0, 25), [localPool, query]);

  // Debounced Open Food Facts search.
  useEffect(() => {
    const q = query.trim();
    setError(null);
    if (q.length < 3) {
      setOnline([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      searchFoods(q, ctrl.signal)
        .then(setOnline)
        .catch((e) => {
          if (e?.name !== 'AbortError') setError('Couldn’t reach the online food database. Check your connection.');
        })
        .finally(() => setLoading(false));
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const openFood = (food: Food) => {
    cacheFood(food);
    router.push({ pathname: '/food', params: { foodId: food.id, meal, date, target: forBuilder ? 'builder' : '' } });
  };

  const showFlash = (text: string) => {
    setFlash(text);
    setTimeout(() => setFlash(null), 1800);
  };

  const quickAdd = (food: Food) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (forBuilder) {
      mealDraft.add({ food, servingIndex: 0, quantity: 1 });
      showFlash(`Added ${food.name} to meal`);
      return;
    }
    dispatch({ type: 'addEntries', entries: [{ id: uid(), date, meal, food, servingIndex: 0, quantity: 1, createdAt: Date.now() }] });
    showFlash(`Added ${food.name}`);
  };

  const logSavedMeal = (m: SavedMeal) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const now = Date.now();
    dispatch({
      type: 'addEntries',
      entries: mealItemsToLog(m).map((it, i) => ({ id: uid() + i, date, meal, ...it, createdAt: now + i })),
    });
    showFlash(`Logged ${m.name}`);
  };

  const foodRow = (f: Food) => (
    <ListRow
      key={f.id}
      title={f.name}
      subtitle={`${f.brand ? f.brand + ' · ' : ''}${Math.round(f.nutrients.calories)} kcal · ${f.servings[0].label}`}
      onPress={() => openFood(f)}
      right={<IconButton filled label={`Quick add ${f.name}`} icon="add" onPress={() => quickAdd(f)} />}
    />
  );

  const listForTab: Food[] = tab === 'recent' ? recents : tab === 'favorites' ? state.favorites : tab === 'mine' ? state.customFoods : [];
  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? 'Meal';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: forBuilder ? 'Add to saved meal' : `Add to ${mealLabel}` }} />
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Field
          placeholder="Search foods, e.g. “greek yogurt”"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <Button small icon="barcode-outline" title="Scan" variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/scan', params: { meal, date, target: forBuilder ? 'builder' : '' } })} />
          <Button small icon="create-outline" title="Create" variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/custom-food', params: { meal, date, target: forBuilder ? 'builder' : '' } })} />
          <Button small icon="flash-outline" title="Quick add" variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/custom-food', params: { meal, date, quick: '1', target: forBuilder ? 'builder' : '' } })} />
        </View>
        {!query && (
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { key: 'recent', label: 'Recent' },
              { key: 'favorites', label: 'Favorites' },
              { key: 'mine', label: 'My foods' },
              ...(forBuilder ? [] : [{ key: 'meals' as Tab, label: 'Meals' }]),
            ]}
            style={{ marginBottom: spacing.sm }}
          />
        )}
      </View>

      {query ? (
        <FlatList
          data={online}
          keyExtractor={(f) => f.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
          ListHeaderComponent={
            <>
              {localResults.length > 0 && (
                <T size={13} weight="700" muted style={{ marginTop: spacing.sm }}>COMMON & SAVED FOODS</T>
              )}
              {localResults.map(foodRow)}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.lg }}>
                <T size={13} weight="700" muted>OPEN FOOD FACTS</T>
                {loading && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
              {error && <T size={13} color={colors.danger} style={{ marginTop: 6 }}>{error}</T>}
              {!loading && !error && query.trim().length < 3 && <T size={13} muted style={{ marginTop: 6 }}>Type at least 3 letters to search millions of packaged foods.</T>}
              {!loading && !error && query.trim().length >= 3 && online.length === 0 && <T size={13} muted style={{ marginTop: 6 }}>No online matches.</T>}
            </>
          }
          renderItem={({ item }) => foodRow(item)}
        />
      ) : tab === 'meals' ? (
        <FlatList
          data={state.savedMeals}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
          ListEmptyComponent={<EmptyState icon="bookmark-outline" title="No saved meals yet" body="Build one from the Meals tab, or use “Save as meal” on any logged meal." />}
          renderItem={({ item }) => {
            const n = sumItems(mealItemsToLog(item));
            return (
              <ListRow
                icon={item.isRecipe ? 'book-outline' : 'fast-food-outline'}
                title={item.name}
                subtitle={`${Math.round(n.calories)} kcal · ${item.isRecipe ? '1 portion' : `${item.items.length} items`}`}
                onPress={() => logSavedMeal(item)}
                right={<Ionicons name="add-circle" size={30} color={colors.primary} />}
              />
            );
          }}
        />
      ) : (
        <FlatList
          data={listForTab}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
          ListEmptyComponent={
            tab === 'recent' ? (
              <EmptyState icon="time-outline" title="No recent foods" body="Search above or scan a barcode to log your first food." />
            ) : tab === 'favorites' ? (
              <EmptyState icon="heart-outline" title="No favorites yet" body="Tap the heart on any food to keep it here." />
            ) : (
              <EmptyState icon="create-outline" title="No custom foods" body="Create foods and recipes that aren’t in the database." />
            )
          }
          renderItem={({ item }) => foodRow(item)}
        />
      )}

      {flash && (
        <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: colors.text, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 }}>
          <T color={colors.background} weight="600">{flash}</T>
        </View>
      )}
    </View>
  );
}
