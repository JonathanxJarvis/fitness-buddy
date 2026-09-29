import React from 'react';
import { Image, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { T, type IconName } from '@/components/ui';
import { mixHex } from '@/components/FoodThumb';
import { findMeal, type Meal } from '@/lib/meals';
import { radius as radii, useTheme } from '@/theme';

export const MEAL_PHOTOS: Record<string, number> = {};

type Family = { tint: string; icon: IconName };

const FAMILIES = {
  fish: { tint: '#3F82D6', icon: 'fish' },
  poultry: { tint: '#D98A3D', icon: 'restaurant' },
  meat: { tint: '#A5452C', icon: 'flame' },
  egg: { tint: '#F2B233', icon: 'egg' },
  dairy: { tint: '#8B6CF6', icon: 'nutrition' },
  grain: { tint: '#D9A441', icon: 'sunny' },
  pasta: { tint: '#E8B92F', icon: 'restaurant' },
  pizza: { tint: '#E4433A', icon: 'pizza' },
  plant: { tint: '#6CB04A', icon: 'leaf' },
  veg: { tint: '#3E9B4F', icon: 'leaf' },
  fruit: { tint: '#E5483F', icon: 'nutrition' },
  sweet: { tint: '#B5652B', icon: 'ice-cream' },
  cheese: { tint: '#F0B429', icon: 'restaurant' },
  starch: { tint: '#C98A4B', icon: 'restaurant' },
} satisfies Record<string, Family>;

type FamilyKey = keyof typeof FAMILIES;

const GROUPS: [FamilyKey, string[]][] = [
  ['fish', ['salmon', 'salmonRaw', 'smokedSalmon', 'tuna', 'shrimp', 'whiteFish', 'fishSticks']],
  ['poultry', ['chickenBreast', 'chickenBreastRaw', 'chickenThigh', 'turkeyBreast', 'turkeyGround', 'turkeyDeli']],
  ['meat', ['beefLean', 'beefGround', 'beefGroundRaw', 'beefSteak', 'beefChuck', 'porkLoin', 'ham', 'bacon', 'pepperoni', 'bratwurst', 'wiener', 'leberkaese', 'doner', 'jerky', 'maultaschen']],
  ['egg', ['egg', 'eggWhite']],
  ['dairy', ['quark', 'skyr', 'greekYogurt', 'yogurt', 'cottage', 'milk', 'soyMilk', 'whey', 'proteinBar']],
  ['grain', ['oats', 'muesli', 'granola', 'chia', 'riceDry']],
  ['pasta', ['pasta', 'pastaDry', 'wholePasta', 'spaetzle', 'gnocchi', 'riceNoodles', 'couscous', 'quinoa']],
  ['pizza', ['pizzaDough']],
  ['plant', ['tofu', 'lentils', 'lentilsDry', 'splitPeas', 'chickpeas', 'blackBeans', 'kidneyBeans', 'edamame', 'hummus', 'falafel']],
  ['fruit', ['berries', 'blueberries', 'strawberries', 'banana', 'apple', 'orange', 'mango', 'pineapple', 'cherries']],
  ['sweet', ['darkChocolate', 'iceCream', 'apfelstrudel', 'kaesekuchen', 'peanutButter', 'peanuts', 'almonds', 'walnuts', 'flour']],
  ['cheese', ['feta', 'mozzarella', 'parmesan', 'gouda', 'cheddar', 'emmentaler', 'harzer']],
  ['starch', ['rice', 'potatoes', 'sweetPotato', 'fries', 'potatoPancakes']],
];

const FAMILY_OF: Record<string, FamilyKey> = Object.fromEntries(GROUPS.flatMap(([f, keys]) => keys.map((k) => [k, f])));

const CARRIERS = new Set(['wwBread', 'toast', 'roll', 'vollkornbrot', 'knaecke', 'bagel', 'pita', 'tortilla', 'riceCakes', 'croissant', 'pretzel']);

export function mealFamily(meal: Meal): Family {
  const main = meal.ingredients.find((i) => !CARRIERS.has(i.key)) ?? meal.ingredients[0];
  return FAMILIES[FAMILY_OF[main?.key ?? ''] ?? 'veg'];
}

export function MealImage({
  mealId,
  aspectRatio = 4 / 3,
  width,
  rounded = radii.md,
  iconSize = 30,
  style,
}: {
  mealId: string;
  aspectRatio?: number;
  width?: number;
  rounded?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, dark } = useTheme();
  const frame = { width: width ?? '100%', aspectRatio, borderRadius: rounded, overflow: 'hidden' } as const;
  const box: StyleProp<ViewStyle> = [frame, style];
  const photo = MEAL_PHOTOS[mealId];
  if (photo) return <Image source={photo} resizeMode="cover" accessibilityIgnoresInvertColors style={[frame, style as StyleProp<ImageStyle>]} />;
  const meal = findMeal(mealId);
  const { tint, icon } = meal ? mealFamily(meal) : FAMILIES.veg;
  const top = mixHex(tint, dark ? colors.card : '#FFFFFF', dark ? 0.34 : 0.2);
  const bottom = mixHex(tint, dark ? colors.card : '#FFFFFF', dark ? 0.16 : 0.42);
  const initial = (meal?.name ?? '?').replace(/^[^A-Za-zÀ-ÿ]+/, '').charAt(0).toUpperCase();
  const disc = iconSize * 2;
  return (
    <View style={box} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={[top, bottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: disc * 2.2, height: disc * 2.2, borderRadius: disc * 1.1, top: -disc * 0.9, left: -disc * 0.7, backgroundColor: '#FFFFFF', opacity: dark ? 0.05 : 0.35 }} />
        {iconSize >= 24 && (
          <T size={iconSize * 3.4} weight="800" color={tint} style={{ position: 'absolute', right: iconSize * 0.3, bottom: -iconSize * 0.9, opacity: dark ? 0.16 : 0.12 }}>
            {initial}
          </T>
        )}
        <View style={{ width: disc, height: disc, borderRadius: disc / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)' }}>
          <Ionicons name={icon} size={iconSize} color={dark ? mixHex(tint, '#FFFFFF', 0.75) : tint} />
        </View>
      </LinearGradient>
    </View>
  );
}
