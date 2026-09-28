import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button, EmptyState, Field, IconButton, ListRow, Segmented, Sheet, T } from '@/components/ui';
import { PortionPicker } from '@/components/PortionPicker';
import { gramServingIndex } from '@/lib/portion';
import { useStore } from '@/store/StoreProvider';
import { recentFoods, uid } from '@/store/reducer';
import { cacheFood, mealDraft } from '@/store/session';
import { BUILTIN_FOODS, searchLocal } from '@/lib/foodDatabase';
import { GERMAN_FOODS } from '@/lib/germanFoods';
import { searchFoods } from '@/lib/openFoodFacts';
import { searchUsda } from '@/lib/usda';
import { FoodThumb } from '@/components/FoodThumb';
import { MEAL_SHARES, mealItemsToLog, sumItems } from '@/lib/nutrition';
import { mealToFood, searchMeals, suggestMeals } from '@/lib/meals';
import { daySummary } from '@/lib/selectors';
import { todayKey } from '@/lib/dates';
import { spacing, useTheme } from '@/theme';
import { MEALS, type Food, type MealType, type SavedMeal } from '@/lib/types';

type Tab = 'recent' | 'favorites' | 'mine' | 'meals';

export default function AddFood() {
  const params = useLocalSearchParams<{ meal?: MealType; date?: string; target?: string }>();
  const meal = (MEALS.find((m) => m.key === params.meal)?.key ?? 'snacks') as MealType;
  const date = params.date || todayKey();
  const forBuilder = params.target === 'builder';
  const { state, dispatch } = useStore();
  const { colors } = useTheme();

  const region = state.settings.foodRegion;
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('recent');
  const [online, setOnline] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [portion, setPortion] = useState<{ food: Food; servingIndex: number; quantity: number } | null>(null);

  const recents = useMemo(() => recentFoods(state.entries), [state.entries]);
  const localPool = useMemo(() => {
    const byId = new Map<string, Food>();
    // German shoppers get the offline supermarket staples ahead of the US list.
    const staples = region === 'de' ? [...GERMAN_FOODS, ...BUILTIN_FOODS] : [...BUILTIN_FOODS, ...GERMAN_FOODS];
    for (const f of [...state.customFoods, ...state.favorites, ...recents, ...staples]) if (!byId.has(f.id)) byId.set(f.id, f);
    return [...byId.values()];
  }, [state.customFoods, state.favorites, recents, region]);
  const localResults = useMemo(() => searchLocal(localPool, query).slice(0, 25), [localPool, query]);
  // Real meals from the offline meal library, loggable as one food.
  const mealResults = useMemo(() => (query.trim().length >= 2 ? searchMeals(query, region).slice(0, 6).map((m) => mealToFood(m, region)) : []), [query, region]);
  // Empty search: a few meal ideas that fit what's left of today's budget.
  const ideas = useMemo(() => {
    const g = state.goals;
    if (!g) return [];
    const day = daySummary(state, date);
    const kcalLeft = g.calories + day.burned - day.totals.calories;
    const target = Math.max(150, Math.min(kcalLeft, g.calories * MEAL_SHARES[meal] * 1.2));
    return suggestMeals({ meal, kcalLeft: Math.max(kcalLeft, 150), proteinLeft: g.protein - day.totals.protein, region, n: 4, kcalTarget: target, seed: date }).map((m) => mealToFood(m, region));
  }, [state, date, meal, region]);

  // Debounced online search across USDA FoodData Central and Open Food Facts.
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
      Promise.allSettled([searchUsda(q, ctrl.signal), searchFoods(q, ctrl.signal, region)])
        .then(([usda, off]) => {
          if (ctrl.signal.aborted) return;
          const u = usda.status === 'fulfilled' ? usda.value : [];
          const o = off.status === 'fulfilled' ? off.value : [];
          // German shoppers get their supermarket products first; USDA (US foods) follows.
          const [a, b] = region === 'de' ? [o, u] : [u, o];
          if (off.status === 'rejected' && usda.status === 'fulfilled' && region === 'de') {
            setError('The German supermarket database didn’t respond, so these are USDA results. Try again in a moment or scan the barcode.');
          }
          if (usda.status === 'rejected' && off.status === 'rejected') {
            setError('Couldn’t reach the online food databases right now, so only foods stored in the app are shown. Try again in a moment or scan the barcode.');
          }
          // Interleave so both generic (USDA) and packaged (OFF) foods show near the top.
          const merged: Food[] = [];
          const seen = new Set<string>();
          for (let i = 0; i < Math.max(a.length, b.length); i++) {
            for (const f of [a[i], b[i]]) {
              if (!f) continue;
              const k = `${f.name.toLowerCase()}|${(f.brand ?? '').toLowerCase()}`;
              if (seen.has(k)) continue;
              seen.add(k);
              merged.push(f);
            }
          }
          setOnline(merged);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 650);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, region]);

  const openFood = (food: Food) => {
    cacheFood(food);
    router.push({ pathname: '/food', params: { foodId: food.id, meal, date, target: forBuilder ? 'builder' : '' } });
  };

  const showFlash = (text: string) => {
    setFlash(text);
    setTimeout(() => setFlash(null), 1800);
  };

  // The + button asks how much before logging, with grams from a scale or a serving.
  const quickAdd = (food: Food) => {
    const g = gramServingIndex(food);
    const inGrams = food.servings[0]?.label === '100 g' && g >= 0;
    setPortion({ food, servingIndex: inGrams ? g : 0, quantity: inGrams ? 100 : 1 });
  };

  const addPortion = () => {
    if (!portion || portion.quantity <= 0) return;
    const { food, servingIndex, quantity } = portion;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setPortion(null);
    if (forBuilder) {
      mealDraft.add({ food, servingIndex, quantity });
      showFlash(`Added ${food.name} to meal`);
      return;
    }
    dispatch({ type: 'addEntries', entries: [{ id: uid(), date, meal, food, servingIndex, quantity, createdAt: Date.now() }] });
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
    <Pressable key={f.id} onPress={() => openFood(f)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}>
      <FoodThumb food={f} size={42} />
      <View style={{ flex: 1 }}>
        <T weight="700" numberOfLines={1}>{f.name}</T>
        <T size={12} muted numberOfLines={1} style={{ marginTop: 2 }}>
          {f.brand ? f.brand + ' · ' : ''}
          {Math.round(f.nutrients.calories)} kcal · {Math.round(f.nutrients.protein)} g protein · {f.servings[0].label}
        </T>
      </View>
      <IconButton filled label={`Quick add ${f.name}`} icon="add" onPress={() => quickAdd(f)} />
    </Pressable>
  );

  const listForTab: Food[] = tab === 'recent' ? recents : tab === 'favorites' ? state.favorites : tab === 'mine' ? state.customFoods : [];
  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? 'Meal';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: forBuilder ? 'Add to saved meal' : `Add to ${mealLabel}` }} />
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Field
          placeholder={region === 'de' ? 'Search foods, e.g. “Skyr” or “Rewe Vollkornbrot”' : 'Search foods, e.g. “greek yogurt”'}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          {!forBuilder && (
            <Button small icon="camera" title="Snap" style={{ flex: 1, paddingHorizontal: 6, gap: 5 }} onPress={() => router.push({ pathname: '/snap-meal', params: { meal, date } })} />
          )}
          <Button small icon="barcode-outline" title="Scan" variant="secondary" style={{ flex: 1, paddingHorizontal: 6, gap: 5 }} onPress={() => router.push({ pathname: '/scan', params: { meal, date, target: forBuilder ? 'builder' : '' } })} />
          <Button small icon="create-outline" title="Create" variant="secondary" style={{ flex: 1, paddingHorizontal: 6, gap: 5 }} onPress={() => router.push({ pathname: '/custom-food', params: { meal, date, target: forBuilder ? 'builder' : '' } })} />
          <Button small icon="flash-outline" title="Quick" variant="secondary" style={{ flex: 1, paddingHorizontal: 6, gap: 5 }} onPress={() => router.push({ pathname: '/custom-food', params: { meal, date, quick: '1', target: forBuilder ? 'builder' : '' } })} />
        </View>
        {!query && ideas.length > 0 && (
          <>
            <T size={12} weight="800" muted style={{ letterSpacing: 0.6, marginBottom: 6 }}>MEAL IDEAS FOR {mealLabel.toUpperCase()}</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginHorizontal: -spacing.lg, marginBottom: spacing.md }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              {ideas.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => openFood(f)}
                  style={({ pressed }) => ({ width: 168, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.6 : 1 })}
                >
                  <View style={{ flex: 1 }}>
                    <T size={13} weight="700" numberOfLines={2}>{f.name}</T>
                    <T size={11} muted numberOfLines={1} style={{ marginTop: 2 }}>{Math.round(f.nutrients.calories)} kcal · {Math.round(f.nutrients.protein)} g protein</T>
                  </View>
                  <IconButton filled size={18} label={`Quick add ${f.name}`} icon="add" onPress={() => quickAdd(f)} />
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
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
                <T size={12} weight="800" muted style={{ marginTop: spacing.sm, letterSpacing: 0.6 }}>{region === 'de' ? 'GERMAN STAPLES & SAVED FOODS' : 'COMMON & SAVED FOODS'}</T>
              )}
              {localResults.map(foodRow)}
              {mealResults.length > 0 && (
                <T size={12} weight="800" muted style={{ marginTop: spacing.sm, letterSpacing: 0.6 }}>MEALS</T>
              )}
              {mealResults.map(foodRow)}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.lg }}>
                <T size={12} weight="800" muted style={{ letterSpacing: 0.6 }}>{region === 'de' ? 'OPEN FOOD FACTS DEUTSCHLAND & USDA' : 'USDA & OPEN FOOD FACTS'}</T>
                {loading && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
              {error && <T size={13} color={colors.danger} style={{ marginTop: 6 }}>{error}</T>}
              {!loading && !error && query.trim().length < 3 && <T size={13} muted style={{ marginTop: 6 }}>Type at least 3 letters to search millions of foods and packaged products.</T>}
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
          ListEmptyComponent={<EmptyState icon="bookmark-outline" title="No saved meals yet" body="Build one in Profile → My foods & meals, or use “Save as meal” on any logged meal." />}
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

      <Sheet visible={!!portion} onClose={() => setPortion(null)} title={portion?.food.name}>
        {portion && (
          <>
            {portion.food.brand ? <T size={13} muted style={{ marginTop: -6, marginBottom: spacing.sm }}>{portion.food.brand}</T> : null}
            <PortionPicker food={portion.food} servingIndex={portion.servingIndex} quantity={portion.quantity} onChange={(servingIndex, quantity) => setPortion({ ...portion, servingIndex, quantity })} />
            <Button title={forBuilder ? 'Add to saved meal' : `Add to ${mealLabel}`} icon="add-circle" onPress={addPortion} disabled={portion.quantity <= 0} style={{ marginTop: spacing.md }} />
          </>
        )}
      </Sheet>

      {flash && (
        <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: colors.text, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 }}>
          <T color={colors.background} weight="600">{flash}</T>
        </View>
      )}
    </View>
  );
}
