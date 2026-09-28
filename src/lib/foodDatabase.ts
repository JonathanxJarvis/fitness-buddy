import type { Food } from './types';

// Common whole foods, available offline. Values are approximate (USDA FoodData Central).
// Columns: name, serving label, grams per serving, kcal, protein, carbs, fat, fiber, sugar,
// sodium mg, potassium mg, calcium mg, iron mg, vitamin C mg, vitamin D µg
type Row = [string, string, number, number, number, number, number, number, number, number, number, number, number, number, number];

const ROWS: Row[] = [
  // Fruit
  ['Apple', '1 medium', 182, 95, 0.5, 25, 0.3, 4.4, 19, 2, 195, 11, 0.2, 8.4, 0],
  ['Banana', '1 medium', 118, 105, 1.3, 27, 0.4, 3.1, 14, 1, 422, 6, 0.3, 10.3, 0],
  ['Orange', '1 medium', 131, 62, 1.2, 15, 0.2, 3.1, 12, 0, 237, 52, 0.1, 70, 0],
  ['Strawberries', '1 cup', 152, 49, 1, 12, 0.5, 3, 7.4, 2, 233, 24, 0.6, 89, 0],
  ['Blueberries', '1 cup', 148, 84, 1.1, 21, 0.5, 3.6, 15, 1, 114, 9, 0.4, 14, 0],
  ['Grapes', '1 cup', 151, 104, 1.1, 27, 0.2, 1.4, 23, 3, 288, 15, 0.5, 4.8, 0],
  ['Avocado', '1/2 fruit', 100, 160, 2, 8.5, 15, 6.7, 0.7, 7, 485, 12, 0.6, 10, 0],
  ['Mango', '1 cup, sliced', 165, 99, 1.4, 25, 0.6, 2.6, 23, 2, 277, 18, 0.3, 60, 0],
  ['Pineapple', '1 cup chunks', 165, 82, 0.9, 22, 0.2, 2.3, 16, 2, 180, 21, 0.5, 79, 0],
  ['Watermelon', '1 cup diced', 152, 46, 0.9, 11.5, 0.2, 0.6, 9.4, 2, 170, 11, 0.4, 12, 0],
  ['Raspberries', '1 cup', 123, 64, 1.5, 15, 0.8, 8, 5.4, 1, 186, 31, 0.8, 32, 0],
  ['Pear', '1 medium', 178, 101, 0.6, 27, 0.3, 5.5, 17, 2, 206, 16, 0.3, 7.7, 0],
  ['Raisins', '1 small box', 43, 129, 1.3, 34, 0.2, 1.6, 25, 5, 322, 21, 0.8, 1, 0],
  // Vegetables
  ['Broccoli, cooked', '1 cup', 156, 55, 3.7, 11, 0.6, 5.1, 2.2, 64, 457, 62, 1, 101, 0],
  ['Spinach, raw', '1 cup', 30, 7, 0.9, 1.1, 0.1, 0.7, 0.1, 24, 167, 30, 0.8, 8.4, 0],
  ['Carrot', '1 medium', 61, 25, 0.6, 6, 0.1, 1.7, 2.9, 42, 195, 20, 0.2, 3.6, 0],
  ['Tomato', '1 medium', 123, 22, 1.1, 4.8, 0.2, 1.5, 3.2, 6, 292, 12, 0.3, 17, 0],
  ['Cucumber', '1 cup sliced', 104, 16, 0.7, 3.8, 0.1, 0.5, 1.7, 2, 152, 17, 0.3, 3, 0],
  ['Bell pepper, red', '1 medium', 119, 37, 1.2, 7, 0.4, 2.5, 5, 5, 251, 8, 0.5, 152, 0],
  ['Sweet potato, baked', '1 medium', 114, 103, 2.3, 24, 0.2, 3.8, 7.4, 41, 542, 43, 0.8, 22, 0],
  ['Potato, baked', '1 medium', 173, 161, 4.3, 37, 0.2, 3.8, 2, 17, 926, 26, 1.9, 17, 0],
  ['Green beans, cooked', '1 cup', 125, 44, 2.4, 10, 0.4, 4, 4.5, 1, 182, 55, 0.8, 12, 0],
  ['Mixed salad greens', '2 cups', 85, 15, 1.2, 2.9, 0.2, 1.8, 0.5, 30, 230, 45, 1, 12, 0],
  ['Corn, sweet', '1 ear', 90, 88, 3.3, 19, 1.4, 2, 5.6, 14, 243, 2, 0.5, 6.1, 0],
  ['Peas, green', '1 cup', 160, 134, 8.6, 25, 0.4, 8.8, 9.5, 5, 434, 43, 2.5, 23, 0],
  ['Kale, raw', '1 cup', 21, 7, 0.6, 0.9, 0.3, 0.9, 0.2, 11, 73, 53, 0.3, 19, 0],
  ['Mushrooms', '1 cup sliced', 70, 15, 2.2, 2.3, 0.2, 0.7, 1.4, 4, 223, 2, 0.4, 1.5, 0.1],
  ['Onion', '1 medium', 110, 44, 1.2, 10, 0.1, 1.9, 4.7, 4, 161, 25, 0.2, 8.1, 0],
  ['Zucchini', '1 medium', 196, 33, 2.4, 6.1, 0.6, 2, 4.9, 16, 512, 31, 0.7, 35, 0],
  ['Cauliflower', '1 cup', 107, 27, 2.1, 5.3, 0.3, 2.1, 2, 32, 320, 24, 0.5, 52, 0],
  // Grains & bread
  ['White rice, cooked', '1 cup', 158, 205, 4.3, 45, 0.4, 0.6, 0.1, 2, 55, 16, 1.9, 0, 0],
  ['Brown rice, cooked', '1 cup', 195, 216, 5, 45, 1.8, 3.5, 0.7, 10, 84, 20, 0.8, 0, 0],
  ['Oatmeal, cooked', '1 cup', 234, 166, 5.9, 28, 3.6, 4, 0.6, 9, 164, 21, 2.1, 0, 0],
  ['Rolled oats, dry', '1/2 cup', 40, 150, 5, 27, 3, 4, 1, 0, 150, 20, 1.8, 0, 0],
  ['Quinoa, cooked', '1 cup', 185, 222, 8.1, 39, 3.6, 5.2, 1.6, 13, 318, 31, 2.8, 0, 0],
  ['Pasta, cooked', '1 cup', 140, 221, 8.1, 43, 1.3, 2.5, 0.8, 1, 62, 10, 1.8, 0, 0],
  ['Whole wheat bread', '1 slice', 32, 81, 4, 14, 1.1, 1.9, 1.4, 146, 81, 52, 0.8, 0, 0],
  ['White bread', '1 slice', 25, 67, 2.3, 13, 0.8, 0.6, 1.4, 123, 30, 36, 0.9, 0, 0],
  ['Bagel, plain', '1 medium', 105, 277, 11, 55, 1.4, 2.4, 5.5, 443, 106, 97, 3.8, 0, 0],
  ['Flour tortilla', '1 medium (8")', 45, 144, 3.8, 24, 3.6, 1.6, 1.1, 324, 58, 60, 1.5, 0, 0],
  ['Corn tortilla', '1 tortilla', 26, 57, 1.5, 12, 0.7, 1.6, 0.2, 12, 48, 21, 0.3, 0, 0],
  ['Granola', '1/2 cup', 61, 290, 8, 36, 14, 5, 12, 15, 320, 50, 2.3, 0.7, 0],
  ['Cheerios', '1 cup', 28, 100, 3.5, 20, 2, 3, 1, 140, 180, 100, 8.1, 0, 1],
  ['Pancakes', '2 medium', 76, 175, 4.8, 22, 7.5, 0.7, 4, 330, 100, 170, 1.4, 0, 0],
  ['Popcorn, air-popped', '3 cups', 24, 93, 3, 19, 1.1, 3.6, 0.2, 2, 80, 2, 0.8, 0, 0],
  // Protein
  ['Chicken breast, cooked', '4 oz', 113, 187, 35, 0, 4, 0, 0, 84, 290, 17, 1.2, 0, 0.1],
  ['Chicken thigh, cooked', '4 oz', 113, 232, 28, 0, 13, 0, 0, 100, 270, 12, 1.3, 0, 0.1],
  ['Ground beef 85%, cooked', '4 oz', 113, 285, 29, 0, 18, 0, 0, 90, 355, 20, 2.9, 0, 0.1],
  ['Steak, sirloin, cooked', '4 oz', 113, 229, 34, 0, 9.4, 0, 0, 67, 420, 25, 2.2, 0, 0.1],
  ['Salmon, cooked', '4 oz', 113, 233, 25, 0, 14, 0, 0, 69, 430, 17, 0.4, 0, 12],
  ['Tuna, canned in water', '1 can (drained)', 142, 179, 39, 0, 1.3, 0, 0, 470, 330, 20, 2.3, 0, 2.3],
  ['Shrimp, cooked', '4 oz', 113, 112, 27, 0.2, 0.3, 0, 0, 125, 200, 80, 0.6, 0, 0],
  ['Turkey breast, deli', '2 oz', 56, 60, 12, 1, 0.5, 0, 1, 500, 200, 5, 0.3, 0, 0],
  ['Pork chop, cooked', '4 oz', 113, 231, 32, 0, 10.5, 0, 0, 70, 470, 25, 1, 0.7, 0.8],
  ['Bacon', '2 slices', 16, 86, 5.9, 0.2, 6.7, 0, 0, 305, 90, 2, 0.2, 0, 0.1],
  ['Egg, large', '1 egg', 50, 72, 6.3, 0.4, 4.8, 0, 0.2, 71, 69, 28, 0.9, 0, 1.1],
  ['Egg whites', '3 large', 99, 51, 11, 0.7, 0.2, 0, 0.7, 163, 160, 7, 0.1, 0, 0],
  ['Tofu, firm', '1/2 cup', 126, 181, 22, 3.5, 11, 2.9, 0.8, 18, 300, 861, 3.4, 0.3, 0],
  ['Black beans, cooked', '1 cup', 172, 227, 15, 41, 0.9, 15, 0.6, 2, 611, 46, 3.6, 0, 0],
  ['Chickpeas, cooked', '1 cup', 164, 269, 14.5, 45, 4.2, 12.5, 7.9, 11, 477, 80, 4.7, 2.1, 0],
  ['Lentils, cooked', '1 cup', 198, 230, 18, 40, 0.8, 15.6, 3.6, 4, 731, 38, 6.6, 3, 0],
  ['Whey protein powder', '1 scoop', 31, 120, 24, 3, 1.5, 0, 2, 50, 160, 120, 0.5, 0, 0],
  // Dairy
  ['Milk, 2%', '1 cup', 244, 122, 8.1, 12, 4.8, 0, 12, 115, 342, 293, 0, 0, 2.9],
  ['Milk, whole', '1 cup', 244, 149, 7.7, 12, 7.9, 0, 12, 105, 322, 276, 0, 0, 3.2],
  ['Milk, skim', '1 cup', 245, 83, 8.3, 12, 0.2, 0, 12, 103, 382, 299, 0.1, 0, 2.9],
  ['Almond milk, unsweetened', '1 cup', 240, 39, 1, 3.4, 2.5, 0.5, 0, 170, 160, 450, 0.7, 0, 2.4],
  ['Greek yogurt, plain nonfat', '1 container (170 g)', 170, 100, 17, 6, 0.7, 0, 6, 61, 240, 190, 0.1, 0, 0],
  ['Yogurt, flavored', '1 container (150 g)', 150, 140, 5, 25, 2, 0, 19, 70, 230, 180, 0.1, 0, 1.5],
  ['Cheddar cheese', '1 oz', 28, 114, 7, 0.4, 9.4, 0, 0.1, 176, 21, 201, 0.2, 0, 0.2],
  ['Mozzarella, part skim', '1 oz', 28, 72, 6.9, 0.8, 4.5, 0, 0.3, 175, 26, 222, 0.1, 0, 0.1],
  ['Cottage cheese, 2%', '1/2 cup', 113, 92, 12, 5, 2.6, 0, 4.6, 348, 141, 125, 0.2, 0, 0],
  ['Butter', '1 tbsp', 14, 102, 0.1, 0, 11.5, 0, 0, 91, 3, 3, 0, 0, 0],
  ['Cream cheese', '1 tbsp', 14.5, 51, 0.9, 0.8, 5, 0, 0.5, 46, 19, 14, 0, 0, 0],
  // Nuts, seeds, fats
  ['Almonds', '1 oz (23 nuts)', 28, 164, 6, 6.1, 14, 3.5, 1.2, 0, 208, 76, 1.1, 0, 0],
  ['Peanut butter', '2 tbsp', 32, 188, 8, 6.3, 16, 1.9, 3, 147, 208, 17, 0.6, 0, 0],
  ['Walnuts', '1 oz', 28, 185, 4.3, 3.9, 18.5, 1.9, 0.7, 1, 125, 28, 0.8, 0.4, 0],
  ['Cashews', '1 oz', 28, 157, 5.2, 8.6, 12.4, 0.9, 1.7, 3, 187, 10, 1.9, 0.1, 0],
  ['Chia seeds', '1 tbsp', 12, 58, 2, 5, 3.7, 4.1, 0, 2, 49, 76, 0.9, 0, 0],
  ['Olive oil', '1 tbsp', 13.5, 119, 0, 0, 13.5, 0, 0, 0, 0, 0, 0.1, 0, 0],
  ['Hummus', '2 tbsp', 30, 70, 2, 4, 5, 1, 0, 130, 70, 10, 0.6, 0, 0],
  // Meals & snacks
  ['Cheese pizza', '1 slice (14")', 107, 285, 12, 36, 10, 2.5, 3.8, 640, 184, 201, 2.6, 1.3, 0],
  ['Hamburger', '1 burger', 226, 540, 34, 40, 27, 2, 9, 790, 480, 120, 5, 1, 0],
  ['French fries', 'medium order', 117, 365, 4, 48, 17, 4.4, 0.3, 246, 677, 19, 0.9, 5, 0],
  ['Chicken burrito', '1 burrito', 300, 590, 32, 66, 21, 8, 4, 1340, 600, 190, 4.6, 6, 0],
  ['Caesar salad with chicken', '1 bowl', 300, 390, 32, 13, 23, 3, 3, 900, 500, 180, 2, 20, 0],
  ['Turkey sandwich', '1 sandwich', 225, 330, 23, 36, 10, 4, 6, 1100, 380, 120, 3, 4, 0],
  ['Sushi, California roll', '6 pieces', 160, 255, 7, 38, 7, 3.4, 5, 430, 160, 20, 1, 3, 0],
  ['Spaghetti with meat sauce', '1 plate', 350, 510, 25, 65, 16, 6, 10, 850, 650, 70, 4, 12, 0],
  ['Fried rice', '1 cup', 137, 238, 5.5, 45, 4.1, 1.4, 0.9, 530, 90, 20, 1.4, 0, 0.1],
  ['Chicken noodle soup', '1 cup', 240, 62, 3.2, 7.3, 2.4, 0.5, 0.7, 860, 70, 15, 0.8, 0, 0],
  ['Protein bar', '1 bar', 60, 210, 20, 23, 7, 3, 2, 190, 170, 100, 1.5, 0, 0],
  ['Potato chips', '1 oz', 28, 152, 2, 15, 10, 1.3, 0.1, 147, 350, 7, 0.5, 5.3, 0],
  ['Dark chocolate 70%', '1 oz', 28, 170, 2.2, 13, 12, 3.1, 6.8, 6, 203, 20, 3.4, 0, 0],
  ['Chocolate chip cookie', '1 medium', 30, 148, 1.6, 19.5, 7.4, 0.8, 11, 102, 60, 9, 0.8, 0, 0],
  ['Ice cream, vanilla', '1/2 cup', 66, 137, 2.3, 16, 7.3, 0.5, 14, 53, 131, 84, 0.1, 0.4, 0.1],
  ['Donut, glazed', '1 medium', 64, 269, 3.7, 31, 15, 1, 15, 205, 70, 30, 1.2, 0, 0],
  ['Rice cake', '1 cake', 9, 35, 0.7, 7.3, 0.3, 0.4, 0.1, 29, 26, 1, 0.1, 0, 0],
  // Drinks
  ['Coffee, black', '1 cup (8 fl oz)', 237, 2, 0.3, 0, 0, 0, 0, 5, 116, 5, 0, 0, 0],
  ['Latte with 2% milk', '16 fl oz', 473, 190, 13, 19, 7, 0, 17, 170, 540, 450, 0.1, 0, 3],
  ['Orange juice', '1 cup', 248, 112, 1.7, 26, 0.5, 0.5, 21, 2, 496, 27, 0.5, 124, 0],
  ['Cola', '12 fl oz can', 368, 140, 0, 39, 0, 0, 39, 45, 7, 7, 0.1, 0, 0],
  ['Beer, regular', '12 fl oz', 356, 153, 1.6, 13, 0, 0, 0, 14, 96, 14, 0.1, 0, 0],
  ['Red wine', '5 fl oz', 147, 125, 0.1, 3.8, 0, 0, 0.9, 6, 187, 12, 0.7, 0, 0],
  ['Sports drink', '20 fl oz', 591, 140, 0, 36, 0, 0, 34, 270, 75, 0, 0, 0, 0],
  ['Smoothie, fruit', '16 fl oz', 473, 250, 3, 60, 1, 4, 50, 20, 600, 60, 1, 60, 0],
];

export const BUILTIN_FOODS: Food[] = ROWS.map((r, i) => {
  const [name, label, grams, calories, protein, carbs, fat, fiber, sugar, sodium, potassium, calcium, iron, vitaminC, vitaminD] = r;
  return {
    id: `builtin:${i}`,
    name,
    source: 'builtin',
    nutrients: { calories, protein, carbs, fat, fiber, sugar, sodium, potassium, calcium, iron, vitaminC, vitaminD },
    servings: [
      { label, factor: 1 },
      { label: '100 g', factor: 100 / grams },
      { label: '1 oz', factor: 28.3495 / grams },
      { label: '1 g', factor: 1 / grams },
    ],
  };
});

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Case- and accent-insensitive search where every word must match. */
export function searchLocal(foods: Food[], query: string): Food[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return foods
    .filter((f) => {
      const hay = normalize(`${f.name} ${f.brand ?? ''}`);
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => {
      const q = words[0];
      const as = normalize(a.name).startsWith(q) ? 0 : 1;
      const bs = normalize(b.name).startsWith(q) ? 0 : 1;
      return as - bs || a.name.length - b.name.length;
    });
}
