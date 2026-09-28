import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Button, Card, Field, Screen, T } from '@/components/ui';
import { FoodThumb } from '@/components/FoodThumb';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { mealDraft } from '@/store/session';
import { todayKey } from '@/lib/dates';
import { spacing, useTheme } from '@/theme';
import type { Food, MealType, Nutrients, Serving } from '@/lib/types';

const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};
const str = (n?: number) => (n === undefined ? '' : String(+n.toFixed(2)));

export default function CustomFood() {
  const params = useLocalSearchParams<{ barcode?: string; quick?: string; meal?: MealType; date?: string; target?: string; editId?: string }>();
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const quick = params.quick === '1';
  const forBuilder = params.target === 'builder';
  const editing = params.editId ? state.customFoods.find((f) => f.id === params.editId) : undefined;
  const en = editing?.nutrients;

  const [name, setName] = useState(editing?.name ?? (quick ? 'Quick add' : ''));
  const [brand, setBrand] = useState(editing?.brand ?? '');
  const [servingLabel, setServingLabel] = useState(editing?.servings[0].label ?? '1 serving');
  const [servingGrams, setServingGrams] = useState('');
  const [f, setF] = useState<Record<string, string>>({
    calories: str(en?.calories),
    protein: str(en?.protein),
    carbs: str(en?.carbs),
    fat: str(en?.fat),
    fiber: str(en?.fiber),
    sugar: str(en?.sugar),
    sodium: str(en?.sodium),
    potassium: str(en?.potassium),
    calcium: str(en?.calcium),
    iron: str(en?.iron),
    vitaminC: str(en?.vitaminC),
    vitaminD: str(en?.vitaminD),
  });
  const [more, setMore] = useState(false);
  const set = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const calories = num(f.calories);
  const valid = name.trim().length > 0 && calories !== undefined;

  const build = (): Food => {
    const nutrients: Nutrients = {
      calories: calories ?? 0,
      protein: num(f.protein) ?? 0,
      carbs: num(f.carbs) ?? 0,
      fat: num(f.fat) ?? 0,
    };
    for (const k of ['fiber', 'sugar', 'sodium', 'potassium', 'calcium', 'iron', 'vitaminC', 'vitaminD'] as const) {
      const v = num(f[k]);
      if (v !== undefined) nutrients[k] = v;
    }
    const grams = num(servingGrams);
    const servings: Serving[] = [{ label: servingLabel.trim() || '1 serving', factor: 1 }];
    if (grams && grams > 0) {
      servings.push({ label: '100 g', factor: 100 / grams }, { label: '1 oz', factor: 28.3495 / grams }, { label: '1 g', factor: 1 / grams });
    } else if (editing) {
      servings.push(...editing.servings.slice(1));
    }
    return {
      id: editing?.id ?? `custom:${uid()}`,
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: editing?.barcode ?? params.barcode,
      source: 'custom',
      nutrients,
      servings,
    };
  };

  const save = () => {
    if (!valid) return;
    const food = build();
    if (quick) {
      // Quick add logs straight to the diary without cluttering "My foods".
      if (forBuilder) {
        mealDraft.add({ food, servingIndex: 0, quantity: 1 });
        router.dismissTo('/meal-builder');
        return;
      }
      dispatch({
        type: 'addEntries',
        entries: [{ id: uid(), date: params.date ?? todayKey(), meal: params.meal ?? 'snacks', food, servingIndex: 0, quantity: 1, createdAt: Date.now() }],
      });
      router.dismissTo('/');
      return;
    }
    dispatch({ type: 'saveCustomFood', food });
    if (editing) {
      router.back();
      return;
    }
    router.replace({ pathname: '/food', params: { foodId: food.id, meal: params.meal ?? '', date: params.date ?? '', target: params.target ?? '' } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Stack.Screen options={{ title: quick ? 'Quick add' : editing ? 'Edit food' : 'New food' }} />
        {params.barcode ? <T muted size={13} style={{ marginBottom: spacing.md }}>Barcode {params.barcode} will be linked to this food.</T> : null}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
            <Field style={{ flex: 1 }} label="Name" value={name} onChangeText={setName} placeholder="e.g. Mom’s lasagna" />
            {/* The picture follows the name as you type, the same one the diary will show. */}
            <View style={{ marginBottom: spacing.md }}>
              <FoodThumb food={{ name: name.trim() || 'dish' }} size={48} />
            </View>
          </View>
          {!quick && (
            <>
              <Field label="Brand (optional)" value={brand} onChangeText={setBrand} />
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Field style={{ flex: 3 }} label="Serving" value={servingLabel} onChangeText={setServingLabel} placeholder="1 cup" />
                <Field style={{ flex: 2 }} label="Weight (optional)" value={servingGrams} onChangeText={setServingGrams} keyboardType="decimal-pad" suffix="g" />
              </View>
            </>
          )}
        </Card>
        <Card>
          <T weight="700" style={{ marginBottom: spacing.md }}>Per serving</T>
          <Field label="Calories" value={f.calories} onChangeText={set('calories')} keyboardType="decimal-pad" suffix="kcal" />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Field style={{ flex: 1 }} label="Protein" value={f.protein} onChangeText={set('protein')} keyboardType="decimal-pad" suffix="g" />
            <Field style={{ flex: 1 }} label="Carbs" value={f.carbs} onChangeText={set('carbs')} keyboardType="decimal-pad" suffix="g" />
            <Field style={{ flex: 1 }} label="Fat" value={f.fat} onChangeText={set('fat')} keyboardType="decimal-pad" suffix="g" />
          </View>
          {!quick && (
            <>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Field style={{ flex: 1 }} label="Fiber" value={f.fiber} onChangeText={set('fiber')} keyboardType="decimal-pad" suffix="g" />
                <Field style={{ flex: 1 }} label="Sugar" value={f.sugar} onChangeText={set('sugar')} keyboardType="decimal-pad" suffix="g" />
                <Field style={{ flex: 1 }} label="Sodium" value={f.sodium} onChangeText={set('sodium')} keyboardType="decimal-pad" suffix="mg" />
              </View>
              <Pressable onPress={() => setMore(!more)}>
                <T weight="700" color={colors.primary}>{more ? 'Hide vitamins & minerals' : 'Add vitamins & minerals'}</T>
              </Pressable>
              {more && (
                <View style={{ marginTop: spacing.md }}>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Field style={{ flex: 1 }} label="Potassium" value={f.potassium} onChangeText={set('potassium')} keyboardType="decimal-pad" suffix="mg" />
                    <Field style={{ flex: 1 }} label="Calcium" value={f.calcium} onChangeText={set('calcium')} keyboardType="decimal-pad" suffix="mg" />
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Field style={{ flex: 1 }} label="Iron" value={f.iron} onChangeText={set('iron')} keyboardType="decimal-pad" suffix="mg" />
                    <Field style={{ flex: 1 }} label="Vitamin C" value={f.vitaminC} onChangeText={set('vitaminC')} keyboardType="decimal-pad" suffix="mg" />
                    <Field style={{ flex: 1 }} label="Vitamin D" value={f.vitaminD} onChangeText={set('vitaminD')} keyboardType="decimal-pad" suffix="µg" />
                  </View>
                </View>
              )}
            </>
          )}
        </Card>
        <Button title={quick ? 'Add to diary' : editing ? 'Save food' : 'Save and continue'} icon="checkmark" disabled={!valid} onPress={save} />
        {editing && (
          <Button
            title="Delete food"
            variant="danger"
            style={{ marginTop: spacing.md }}
            onPress={() =>
              Alert.alert('Delete this food?', 'Past diary entries keep their values.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    dispatch({ type: 'deleteCustomFood', id: editing.id });
                    router.back();
                  },
                },
              ])
            }
          />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
