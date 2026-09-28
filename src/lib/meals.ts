import { todayKey } from './dates';
import type { Food, FoodRegion, MealType, Nutrients } from './types';

/*
 * A curated offline library of real meals (German classics plus US and
 * international staples). Every meal is a list of ingredients in grams AS
 * EATEN (cooked rice, cooked meat, drained beans), and its nutrients are
 * computed from the ingredient table below, so the numbers stay consistent.
 *
 * Ingredient values are per 100 g and come from standard reference tables:
 * - USDA FoodData Central, SR Legacy (April 2018) and FNDDS 2019–2020
 *   (public domain), for most whole foods and US products;
 * - Bundeslebensmittelschlüssel (BLS 3.02, Max Rubner-Institut) and typical
 *   German supermarket label values for German products (Magerquark, Skyr,
 *   Vollkornbrot, Leberkäse, Maultaschen, Dönerfleisch, Curryketchup, …).
 * Carbohydrate is total carbohydrate including fiber (USDA convention).
 * Values are rounded; real portions vary, so treat them as good estimates.
 */

export type MealCuisine = 'de' | 'us' | 'intl';
export type MealTag = 'high-protein' | 'vegetarian' | 'vegan' | 'quick' | 'meal-prep' | 'treat' | 'low-carb' | 'budget';

type Diet = 'vg' | 'vt' | 'm'; // vegan, vegetarian, meat/fish
// name, German name, diet, then per 100 g: kcal, protein, carbs, fat, fiber, sugar, sodium mg
type IngRow = [string, string, Diet, number, number, number, number, number, number, number];

export interface Ingredient {
  key: string;
  name: string;
  nameDe: string;
  diet: Diet;
  per100: Required<Pick<Nutrients, 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium'>>;
}

const ING: Record<string, IngRow> = {
  // Dairy & eggs
  oats: ['Rolled oats', 'Haferflocken', 'vg', 379, 13.2, 67.7, 6.5, 10.1, 1, 6],
  muesli: ['Muesli, no added sugar', 'Müsli ohne Zuckerzusatz', 'vt', 360, 10, 65, 8, 9, 12, 20],
  granola: ['Granola', 'Knuspermüsli', 'vt', 471, 10, 64, 20, 5.3, 25, 26],
  skyr: ['Skyr', 'Skyr', 'vt', 63, 11, 4, 0.2, 0, 4, 40],
  quark: ['Low-fat quark', 'Magerquark', 'vt', 67, 12, 4, 0.3, 0, 4, 40],
  greekYogurt: ['Greek yogurt, nonfat', 'Griechischer Joghurt 0,2 %', 'vt', 59, 10.2, 3.6, 0.4, 0, 3.2, 36],
  yogurt: ['Plain yogurt 1.5 %', 'Naturjoghurt 1,5 %', 'vt', 49, 4.3, 4.8, 1.5, 0, 4.8, 50],
  cottage: ['Cottage cheese', 'Hüttenkäse', 'vt', 98, 11.1, 3.4, 4.3, 0, 2.7, 364],
  milk: ['Low-fat milk 1.5 %', 'Fettarme Milch 1,5 %', 'vt', 47, 3.4, 4.9, 1.5, 0, 4.9, 44],
  soyMilk: ['Soy milk, unsweetened', 'Sojadrink ungesüßt', 'vg', 33, 2.9, 1.7, 1.6, 0.4, 0.3, 50],
  whey: ['Whey protein powder', 'Whey-Proteinpulver', 'vt', 380, 78, 8, 5, 0, 5, 300],
  egg: ['Egg', 'Ei', 'vt', 143, 12.6, 0.7, 9.5, 0, 0.4, 142],
  eggWhite: ['Egg white', 'Eiklar', 'vt', 52, 10.9, 0.7, 0.2, 0, 0.7, 166],
  feta: ['Feta', 'Feta', 'vt', 264, 14.2, 4.1, 21.3, 0, 4.1, 1116],
  mozzarella: ['Mozzarella', 'Mozzarella', 'vt', 250, 18, 1, 19, 0, 1, 200],
  parmesan: ['Parmesan', 'Parmesan', 'vt', 392, 35.8, 3.2, 25.8, 0, 0.8, 1376],
  gouda: ['Gouda', 'Gouda', 'vt', 356, 24.9, 2.2, 27.4, 0, 2.2, 819],
  cheddar: ['Cheddar', 'Cheddar', 'vt', 403, 24.9, 1.3, 33.1, 0, 0.5, 621],
  emmentaler: ['Emmental', 'Emmentaler', 'vt', 380, 28, 0, 30, 0, 0, 160],
  harzer: ['Harzer cheese', 'Harzer Käse', 'vt', 110, 27, 0, 0.5, 0, 0, 1300],
  creamCheese: ['Cream cheese', 'Frischkäse', 'vt', 350, 6.2, 5.5, 34.4, 0, 3.8, 314],
  creamCheeseLight: ['Light cream cheese', 'Frischkäse light', 'vt', 201, 7.9, 8.1, 15.3, 0, 6.4, 470],
  butter: ['Butter', 'Butter', 'vt', 717, 0.9, 0.1, 81.1, 0, 0.1, 11],
  cream: ['Cream 30 %', 'Schlagsahne 30 %', 'vt', 292, 2.4, 3.2, 30, 0, 3.2, 40],
  cookingCream: ['Cooking cream 15 %', 'Kochsahne 15 %', 'vt', 164, 3, 4, 15, 0, 4, 40],
  sourCream: ['Sour cream', 'Saure Sahne', 'vt', 198, 2.4, 4.6, 19.4, 0, 3.4, 31],
  cremeFraiche: ['Crème fraîche', 'Crème fraîche', 'vt', 292, 2.4, 2.8, 30, 0, 2.8, 40],
  tzatziki: ['Tzatziki', 'Tzatziki', 'vt', 110, 4, 4, 8.5, 0.3, 3.5, 300],
  iceCream: ['Vanilla ice cream', 'Vanilleeis', 'vt', 207, 3.5, 23.6, 11, 0.7, 21.2, 80],

  // Meat & fish (cooked unless noted)
  chickenBreast: ['Chicken breast, cooked', 'Hähnchenbrust', 'm', 165, 31, 0, 3.6, 0, 0, 74],
  chickenBreastRaw: ['Chicken breast, raw', 'Hähnchenbrust (roh)', 'm', 120, 22.5, 0, 2.6, 0, 0, 45],
  chickenThigh: ['Chicken thigh, cooked', 'Hähnchenschenkel', 'm', 209, 26, 0, 10.9, 0, 0, 88],
  turkeyBreast: ['Turkey breast, cooked', 'Putenbrust', 'm', 147, 30.1, 0, 2.1, 0, 0, 99],
  turkeyGround: ['Ground turkey, cooked', 'Putenhack', 'm', 203, 27.4, 0, 10.4, 0, 0, 78],
  turkeyDeli: ['Turkey breast slices', 'Putenbrust-Aufschnitt', 'm', 104, 17, 4, 2, 0, 3, 1000],
  beefLean: ['Lean ground beef, cooked', 'Tatar / mageres Rinderhack', 'm', 217, 26.1, 0, 11.7, 0, 0, 72],
  beefGround: ['Ground beef 80/20, cooked', 'Rinderhack', 'm', 272, 25.4, 0, 18.2, 0, 0, 83],
  beefGroundRaw: ['Ground beef, raw', 'Rinderhack (roh)', 'm', 254, 17.2, 0, 20, 0, 0, 66],
  beefSteak: ['Beef steak, lean, cooked', 'Rindersteak', 'm', 190, 29, 0, 7.6, 0, 0, 60],
  beefChuck: ['Beef chuck, braised', 'Rindergulasch-Fleisch', 'm', 245, 29, 0, 13.5, 0, 0, 60],
  porkLoin: ['Pork loin, cooked', 'Schweinelende', 'm', 143, 26.2, 0, 3.5, 0, 0, 57],
  ham: ['Cooked ham', 'Kochschinken', 'm', 107, 19.5, 1, 2.9, 0, 1, 1000],
  bacon: ['Bacon, cooked', 'Bacon / Speck', 'm', 541, 37, 1.4, 42, 0, 0, 1717],
  pepperoni: ['Pepperoni', 'Salami (Peperoni)', 'm', 504, 19.3, 1.2, 46.3, 0, 0, 1582],
  bratwurst: ['Bratwurst', 'Bratwurst', 'm', 297, 12.2, 2.9, 26, 0, 0, 750],
  wiener: ['Wiener sausage', 'Wiener Würstchen', 'm', 270, 13, 1, 24, 0, 0.5, 800],
  leberkaese: ['Leberkäse', 'Leberkäse', 'm', 297, 12, 1, 27.5, 0, 0.5, 800],
  doner: ['Döner meat', 'Dönerfleisch', 'm', 215, 19, 3, 14, 0, 1, 800],
  jerky: ['Beef jerky', 'Beef Jerky', 'm', 410, 33.2, 11, 25.6, 1.8, 9, 2081],
  salmon: ['Salmon, cooked', 'Lachsfilet', 'm', 206, 22.1, 0, 12.4, 0, 0, 61],
  salmonRaw: ['Salmon, sushi-grade', 'Lachs (roh)', 'm', 208, 20.4, 0, 13.4, 0, 0, 59],
  smokedSalmon: ['Smoked salmon', 'Räucherlachs', 'm', 117, 18.3, 0, 4.3, 0, 0, 2000],
  tuna: ['Tuna in water, drained', 'Thunfisch naturell', 'm', 116, 25.5, 0, 0.8, 0, 0, 338],
  shrimp: ['Shrimp, cooked', 'Garnelen', 'm', 99, 24, 0.2, 0.3, 0, 0, 111],
  whiteFish: ['White fish (cod/pollock), cooked', 'Seelachs / Kabeljau', 'm', 105, 22.8, 0, 0.9, 0, 0, 78],
  fishSticks: ['Fish sticks, baked', 'Fischstäbchen', 'm', 195, 13, 18.5, 8, 1, 1, 380],

  // Plant protein
  tofu: ['Tofu, firm', 'Tofu natur', 'vg', 144, 17.3, 2.8, 8.7, 2.3, 0.6, 14],
  lentils: ['Lentils, cooked', 'Linsen (gekocht)', 'vg', 116, 9, 20.1, 0.4, 7.9, 1.8, 2],
  lentilsDry: ['Lentils, dry', 'Linsen (trocken)', 'vg', 352, 24.6, 63.4, 1.1, 10.7, 2, 6],
  splitPeas: ['Split peas, cooked', 'Schälerbsen (gekocht)', 'vg', 118, 8.3, 21.1, 0.4, 8.3, 2.9, 2],
  chickpeas: ['Chickpeas, cooked', 'Kichererbsen', 'vg', 164, 8.9, 27.4, 2.6, 7.6, 4.8, 7],
  blackBeans: ['Black beans, cooked', 'Schwarze Bohnen', 'vg', 132, 8.9, 23.7, 0.5, 8.7, 0.3, 1],
  kidneyBeans: ['Kidney beans, cooked', 'Kidneybohnen', 'vg', 127, 8.7, 22.8, 0.5, 6.4, 0.3, 2],
  edamame: ['Edamame', 'Edamame', 'vg', 121, 11.9, 8.9, 5.2, 5.2, 2.2, 6],
  hummus: ['Hummus', 'Hummus', 'vg', 166, 7.9, 14.3, 9.6, 6, 0.3, 379],
  falafel: ['Falafel', 'Falafel', 'vg', 333, 13.3, 31.8, 17.8, 4.9, 1, 294],
  peanutButter: ['Peanut butter', 'Erdnussbutter', 'vg', 588, 25, 20, 50, 6, 9.2, 459],
  peanuts: ['Peanuts', 'Erdnüsse', 'vg', 567, 25.8, 16.1, 49.2, 8.5, 4, 18],
  almonds: ['Almonds', 'Mandeln', 'vg', 579, 21.2, 21.6, 49.9, 12.5, 4.4, 1],
  walnuts: ['Walnuts', 'Walnüsse', 'vg', 654, 15.2, 13.7, 65.2, 6.7, 2.6, 2],
  chia: ['Chia seeds', 'Chiasamen', 'vg', 486, 16.5, 42.1, 30.7, 34.4, 0, 16],
  tahini: ['Tahini', 'Tahin', 'vg', 595, 17, 21.2, 53.8, 9.3, 0.5, 115],
  proteinBar: ['Protein bar', 'Proteinriegel', 'vt', 350, 33, 32, 12, 10, 3, 250],

  // Grains, bread, starch (cooked unless noted)
  rice: ['Rice, cooked', 'Reis (gekocht)', 'vg', 130, 2.7, 28.2, 0.3, 0.4, 0.1, 1],
  riceDry: ['Rice, dry', 'Reis (ungekocht)', 'vg', 365, 7.1, 80, 0.7, 1.3, 0.1, 5],
  pasta: ['Pasta, cooked', 'Nudeln (gekocht)', 'vg', 158, 5.8, 30.9, 0.9, 1.8, 0.6, 1],
  pastaDry: ['Pasta, dry', 'Nudeln (ungekocht)', 'vg', 371, 13, 74.7, 1.5, 3.2, 2.7, 6],
  wholePasta: ['Whole-wheat pasta, cooked', 'Vollkornnudeln (gekocht)', 'vg', 149, 6, 31.3, 1.7, 3.9, 0.8, 4],
  spaetzle: ['Spätzle, cooked', 'Spätzle', 'vt', 157, 5.3, 28, 2.6, 1.2, 0.5, 90],
  gnocchi: ['Potato gnocchi', 'Gnocchi', 'vg', 150, 3.5, 32, 0.5, 1.5, 0.5, 400],
  maultaschen: ['Maultaschen (Swabian dumplings)', 'Maultaschen', 'm', 205, 8.5, 26, 7, 1.8, 1.5, 520],
  riceNoodles: ['Rice noodles, cooked', 'Reisnudeln (gekocht)', 'vg', 108, 1.8, 24, 0.2, 1, 0, 19],
  quinoa: ['Quinoa, cooked', 'Quinoa (gekocht)', 'vg', 120, 4.4, 21.3, 1.9, 2.8, 0.9, 7],
  couscous: ['Couscous, cooked', 'Couscous (gekocht)', 'vg', 112, 3.8, 23.2, 0.2, 1.4, 0.1, 5],
  potatoes: ['Potatoes, boiled', 'Kartoffeln (gekocht)', 'vg', 87, 1.9, 20.1, 0.1, 1.8, 0.9, 4],
  sweetPotato: ['Sweet potato, baked', 'Süßkartoffel', 'vg', 90, 2, 20.7, 0.2, 3.3, 6.5, 36],
  fries: ['French fries', 'Pommes frites', 'vg', 312, 3.4, 41.4, 14.7, 3.8, 0.3, 210],
  potatoPancakes: ['Potato pancakes', 'Kartoffelpuffer', 'vt', 268, 6.1, 27.8, 14.8, 3.3, 2, 764],
  vollkornbrot: ['Whole-grain rye bread', 'Vollkornbrot', 'vg', 218, 7, 45.5, 1.4, 7.5, 3, 440],
  wwBread: ['Whole-wheat bread', 'Vollkorntoast', 'vg', 252, 12.4, 42.7, 3.5, 6, 4.4, 450],
  toast: ['White bread', 'Toastbrot', 'vg', 266, 7.6, 50.6, 3.3, 2.4, 5.3, 490],
  roll: ['Bread roll / bun', 'Brötchen', 'vg', 293, 9.9, 52.7, 4.3, 2.3, 1.9, 543],
  pretzel: ['Soft pretzel', 'Laugenbrezel', 'vg', 272, 8.5, 56.6, 1.8, 2.6, 1, 1120],
  knaecke: ['Rye crispbread', 'Knäckebrot', 'vg', 366, 7.9, 82.2, 1.3, 16.5, 1, 26],
  riceCakes: ['Rice cakes', 'Reiswaffeln', 'vg', 387, 8.2, 81.5, 2.8, 4.2, 0.9, 6],
  bagel: ['Bagel', 'Bagel', 'vg', 257, 10.5, 50.5, 1.7, 2.3, 5, 450],
  croissant: ['Croissant', 'Croissant', 'vt', 406, 8.2, 45.8, 21, 2.6, 11.3, 384],
  pita: ['Pita / flatbread', 'Fladenbrot', 'vg', 275, 9.1, 55.7, 1.2, 2.2, 1.3, 536],
  tortilla: ['Flour tortilla', 'Weizentortilla / Wrap', 'vg', 306, 8.2, 50.4, 7.9, 3.5, 3.1, 634],
  cornTortilla: ['Corn tortilla', 'Maistortilla', 'vg', 218, 5.7, 44.6, 2.9, 6.3, 0.9, 45],
  tortillaChips: ['Tortilla chips', 'Tortilla-Chips', 'vg', 489, 7, 63.2, 23.4, 5.3, 1, 420],
  pizzaDough: ['Pizza crust, baked', 'Pizzateig (gebacken)', 'vg', 275, 8.5, 52, 3.5, 2.3, 2.5, 550],
  flour: ['Wheat flour', 'Weizenmehl', 'vg', 364, 10.3, 76.3, 1, 2.7, 0.3, 2],
  breadcrumbs: ['Breadcrumbs', 'Paniermehl', 'vg', 395, 13.4, 71.9, 5.3, 4.5, 6.2, 732],

  // Vegetables
  broccoli: ['Broccoli', 'Brokkoli', 'vg', 35, 2.4, 7.2, 0.4, 3.3, 1.4, 41],
  spinach: ['Spinach', 'Spinat', 'vg', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79],
  greens: ['Lettuce / salad greens', 'Blattsalat', 'vg', 17, 1.2, 3.3, 0.3, 2.1, 1.2, 8],
  tomato: ['Tomato', 'Tomate', 'vg', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5],
  cucumber: ['Cucumber', 'Gurke', 'vg', 15, 0.7, 3.6, 0.1, 0.5, 1.7, 2],
  bellPepper: ['Bell pepper', 'Paprika', 'vg', 31, 1, 6, 0.3, 2.1, 4.2, 4],
  onion: ['Onion', 'Zwiebel', 'vg', 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4],
  carrot: ['Carrot', 'Karotte', 'vg', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 69],
  zucchini: ['Zucchini', 'Zucchini', 'vg', 17, 1.2, 3.1, 0.3, 1, 2.5, 8],
  mushrooms: ['Mushrooms', 'Champignons', 'vg', 22, 3.1, 3.3, 0.3, 1, 2, 5],
  greenBeans: ['Green beans', 'Grüne Bohnen', 'vg', 35, 1.9, 7.9, 0.3, 3.2, 1.6, 1],
  peas: ['Green peas', 'Erbsen', 'vg', 81, 5.4, 14.5, 0.4, 5.1, 5.7, 5],
  corn: ['Sweet corn', 'Mais', 'vg', 86, 3.3, 18.7, 1.4, 2, 6.3, 15],
  asparagus: ['Asparagus', 'Spargel', 'vg', 20, 2.2, 3.9, 0.1, 2.1, 1.9, 2],
  cabbage: ['White cabbage', 'Weißkohl', 'vg', 25, 1.3, 5.8, 0.1, 2.5, 3.2, 18],
  sauerkraut: ['Sauerkraut', 'Sauerkraut', 'vg', 19, 0.9, 4.3, 0.1, 2.9, 1.8, 661],
  stirFryVeg: ['Stir-fry vegetables', 'Wokgemüse', 'vg', 35, 2, 6.5, 0.3, 2.5, 3, 20],
  mixedVeg: ['Mixed vegetables', 'Gemüsemischung', 'vg', 65, 2.9, 13.1, 0.2, 4.4, 3.1, 35],
  avocado: ['Avocado', 'Avocado', 'vg', 160, 2, 8.5, 14.7, 6.7, 0.7, 7],
  olives: ['Olives', 'Oliven', 'vg', 115, 0.8, 6.3, 10.7, 3.2, 0, 735],
  passata: ['Tomato passata', 'Passierte Tomaten', 'vg', 32, 1.4, 6, 0.2, 1.5, 4.5, 20],
  salsa: ['Salsa', 'Salsa', 'vg', 36, 1.5, 6.7, 0.2, 1.9, 4, 711],
  broth: ['Vegetable broth', 'Gemüsebrühe', 'vg', 6, 0.2, 0.9, 0.2, 0, 0.4, 300],

  // Fruit
  berries: ['Mixed berries', 'Beerenmischung', 'vg', 45, 0.9, 10.5, 0.4, 3.5, 6.5, 1],
  blueberries: ['Blueberries', 'Heidelbeeren', 'vg', 57, 0.7, 14.5, 0.3, 2.4, 10, 1],
  strawberries: ['Strawberries', 'Erdbeeren', 'vg', 32, 0.7, 7.7, 0.3, 2, 4.9, 1],
  banana: ['Banana', 'Banane', 'vg', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 1],
  apple: ['Apple', 'Apfel', 'vg', 52, 0.3, 13.8, 0.2, 2.4, 10.4, 1],
  orange: ['Orange', 'Orange', 'vg', 47, 0.9, 11.8, 0.1, 2.4, 9.4, 0],
  mango: ['Mango', 'Mango', 'vg', 60, 0.8, 15, 0.4, 1.6, 13.7, 1],
  pineapple: ['Pineapple', 'Ananas', 'vg', 50, 0.5, 13.1, 0.1, 1.4, 9.9, 1],
  cherries: ['Sour cherries', 'Sauerkirschen', 'vg', 50, 1, 12.2, 0.3, 1.6, 8.5, 3],
  raisins: ['Raisins', 'Rosinen', 'vg', 299, 3.1, 79.2, 0.5, 3.7, 59.2, 11],
  appleSauce: ['Apple sauce', 'Apfelmus', 'vg', 68, 0.2, 17.5, 0.1, 1.2, 15, 2],

  // Fats, sauces, sweets
  oil: ['Olive or rapeseed oil', 'Oliven- oder Rapsöl', 'vg', 884, 0, 0, 100, 0, 0, 2],
  mayo: ['Mayonnaise', 'Mayonnaise', 'vt', 680, 1, 0.6, 75, 0, 0.6, 635],
  caesarDressing: ['Caesar dressing', 'Caesar-Dressing', 'vt', 542, 2.2, 3.3, 57.9, 0, 2.8, 1209],
  pesto: ['Basil pesto', 'Pesto Genovese', 'vt', 458, 5, 6, 46, 2, 3, 1100],
  soy: ['Soy sauce', 'Sojasoße', 'vg', 53, 8.1, 4.9, 0.6, 0.8, 0.4, 5493],
  ketchup: ['Ketchup', 'Ketchup', 'vg', 101, 1, 27.4, 0.1, 0.3, 21.3, 907],
  curryKetchup: ['Curry ketchup', 'Curryketchup', 'vg', 104, 1.2, 24, 0.4, 0.9, 22, 1000],
  mustard: ['Mustard', 'Senf', 'vg', 66, 3.7, 5.8, 3.3, 3.3, 0.9, 1100],
  coconutLight: ['Coconut milk, light', 'Kokosmilch light', 'vg', 74, 0.7, 1.6, 7.2, 0, 1, 20],
  honey: ['Honey', 'Honig', 'vt', 304, 0.3, 82.4, 0, 0.2, 82.1, 4],
  maple: ['Maple syrup', 'Ahornsirup', 'vg', 260, 0, 67, 0.1, 0, 60, 12],
  jam: ['Jam', 'Marmelade', 'vg', 278, 0.4, 68.9, 0.1, 1.1, 48.5, 32],
  sugar: ['Sugar', 'Zucker', 'vg', 387, 0, 100, 0, 0, 100, 1],
  darkChocolate: ['Dark chocolate 70 %', 'Zartbitterschokolade 70 %', 'vt', 598, 7.8, 45.9, 42.6, 10.9, 24, 20],
  apfelstrudel: ['Apple strudel', 'Apfelstrudel', 'vt', 274, 3.3, 41.1, 11.2, 2.2, 18, 270],
  kaesekuchen: ['German cheesecake', 'Käsekuchen', 'vt', 230, 7, 27, 10.5, 0.5, 18, 150],
};

export const INGREDIENTS: Record<string, Ingredient> = Object.fromEntries(
  Object.entries(ING).map(([key, [name, nameDe, diet, calories, protein, carbs, fat, fiber, sugar, sodium]]) => [
    key,
    { key, name, nameDe, diet, per100: { calories, protein, carbs, fat, fiber, sugar, sodium } },
  ]),
);

export interface MealIngredient {
  key: string;
  name: string;
  nameDe: string;
  grams: number;
}

export interface Meal {
  id: string;
  name: string;
  nameDe: string;
  cuisine: MealCuisine;
  meals: MealType[];
  tags: MealTag[];
  prepMinutes: number;
  ingredients: MealIngredient[];
  steps: string[];
  /** Grams in one serving (sum of ingredients). */
  grams: number;
  /** Nutrients for one serving, computed from the ingredients. */
  nutrients: Nutrients;
}

const NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'] as const;

/** Nutrients for one serving of a meal, computed from its ingredient grams. */
export function mealNutrients(meal: Pick<Meal, 'ingredients'>): Nutrients {
  const out: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  for (const it of meal.ingredients) {
    const ing = INGREDIENTS[it.key];
    if (!ing) continue;
    for (const k of NUTRIENT_KEYS) out[k] = (out[k] ?? 0) + (ing.per100[k] * it.grams) / 100;
  }
  for (const k of NUTRIENT_KEYS) out[k] = Math.round((out[k] ?? 0) * 10) / 10;
  return out;
}

const MEAL_CODES: Record<string, MealType> = { b: 'breakfast', l: 'lunch', d: 'dinner', s: 'snacks' };

function M(
  id: string,
  name: string,
  nameDe: string,
  cuisine: MealCuisine,
  when: string,
  extra: MealTag[],
  prepMinutes: number,
  items: [string, number][],
  steps: string[],
): Meal {
  const ingredients = items.map(([key, grams]) => {
    const ing = INGREDIENTS[key];
    if (!ing) throw new Error(`Unknown ingredient ${key} in meal ${id}`);
    return { key, name: ing.name, nameDe: ing.nameDe, grams };
  });
  const nutrients = mealNutrients({ ingredients });
  const diets = ingredients.map((i) => INGREDIENTS[i.key].diet);
  const tags = new Set<MealTag>(extra);
  if (diets.every((d) => d === 'vg')) tags.add('vegan');
  if (diets.every((d) => d !== 'm')) tags.add('vegetarian');
  const pShare = (nutrients.protein * 4) / Math.max(1, nutrients.calories);
  if (pShare >= 0.3 && nutrients.protein >= (when === 's' ? 15 : 25)) tags.add('high-protein');
  if ((nutrients.carbs * 4) / Math.max(1, nutrients.calories) < 0.2) tags.add('low-carb');
  if (prepMinutes <= 10) tags.add('quick');
  return {
    id,
    name,
    nameDe,
    cuisine,
    meals: [...when].map((c) => MEAL_CODES[c]),
    tags: [...tags],
    prepMinutes,
    ingredients,
    steps,
    grams: ingredients.reduce((s, i) => s + i.grams, 0),
    nutrients,
  };
}

// id, English, German, cuisine, meal codes (b/l/d/s), extra tags, prep min, ingredients (g), steps
export const MEALS: Meal[] = [
  // ---------- Breakfast ----------
  M('quark-berries', 'Low-fat quark with berries', 'Magerquark mit Beeren', 'de', 'bs', ['budget'], 3, [['quark', 250], ['berries', 125], ['honey', 10]], ['Stir the quark smooth with a splash of water.', 'Top with berries and honey.']),
  M('oats-skyr-blueberries', 'Oats with skyr and blueberries', 'Haferflocken mit Skyr und Heidelbeeren', 'de', 'b', ['budget'], 5, [['oats', 60], ['skyr', 200], ['blueberries', 100], ['milk', 100]], ['Soak the oats in milk for a few minutes.', 'Stir in skyr, top with blueberries.']),
  M('overnight-oats', 'Overnight oats', 'Overnight Oats', 'us', 'b', ['meal-prep'], 5, [['oats', 50], ['greekYogurt', 150], ['milk', 120], ['chia', 10], ['banana', 60], ['honey', 5]], ['Mix oats, yogurt, milk and chia in a jar.', 'Refrigerate overnight; top with banana.']),
  M('protein-porridge', 'Protein porridge with banana', 'Protein-Porridge mit Banane', 'intl', 'b', [], 8, [['oats', 60], ['milk', 250], ['whey', 25], ['banana', 100]], ['Simmer oats in milk for 5 minutes.', 'Off the heat, stir in whey; top with banana.']),
  M('egg-white-omelette', 'Egg white omelette with spinach and feta', 'Eiweiß-Omelett mit Spinat und Feta', 'us', 'bl', [], 10, [['eggWhite', 200], ['egg', 50], ['spinach', 50], ['feta', 30], ['tomato', 80], ['wwBread', 40], ['oil', 3]], ['Whisk whites with the egg; cook in a lightly oiled pan.', 'Add spinach and feta, fold. Serve with tomato and toast.']),
  M('veggie-omelette', 'Veggie omelette with cheese', 'Gemüse-Omelett mit Käse', 'intl', 'bld', [], 12, [['egg', 150], ['bellPepper', 60], ['mushrooms', 60], ['onion', 30], ['gouda', 20], ['oil', 5]], ['Sauté the vegetables.', 'Pour in beaten eggs, add cheese, fold when set.']),
  M('scrambled-eggs-rye', 'Scrambled eggs on whole-grain bread', 'Rührei mit Vollkornbrot', 'de', 'b', ['budget'], 8, [['egg', 120], ['milk', 30], ['vollkornbrot', 100], ['butter', 5], ['tomato', 100]], ['Scramble eggs with milk over low heat.', 'Serve on buttered bread with tomato.']),
  M('protein-pancakes', 'Protein pancakes with berries', 'Protein-Pancakes mit Beeren', 'us', 'b', [], 15, [['oats', 50], ['egg', 50], ['eggWhite', 100], ['whey', 20], ['banana', 60], ['berries', 100], ['oil', 3]], ['Blend oats, eggs, whey and banana.', 'Cook small pancakes; top with berries.']),
  M('greek-yogurt-parfait', 'Greek yogurt parfait', 'Griechischer Joghurt mit Granola und Beeren', 'us', 'bs', [], 3, [['greekYogurt', 200], ['granola', 40], ['berries', 100], ['honey', 5]], ['Layer yogurt, berries and granola.', 'Drizzle with honey.']),
  M('avocado-toast-eggs', 'Avocado toast with eggs', 'Avocado-Toast mit Ei', 'us', 'bl', [], 10, [['wwBread', 70], ['avocado', 70], ['egg', 100], ['tomato', 50]], ['Toast bread, mash avocado on top.', 'Add fried or poached eggs and tomato.']),
  M('pb-banana-toast', 'Peanut butter banana toast', 'Vollkorntoast mit Erdnussbutter und Banane', 'us', 'bs', ['budget'], 4, [['wwBread', 70], ['peanutButter', 20], ['banana', 100]], ['Toast, spread peanut butter, top with banana slices.']),
  M('bagel-lox', 'Bagel with smoked salmon', 'Bagel mit Räucherlachs', 'us', 'bl', [], 5, [['bagel', 95], ['creamCheeseLight', 30], ['smokedSalmon', 60], ['cucumber', 30], ['onion', 10]], ['Toast the bagel, spread cream cheese.', 'Layer salmon, cucumber and onion.']),
  M('breakfast-burrito', 'Breakfast burrito', 'Frühstücks-Burrito', 'us', 'b', ['meal-prep'], 12, [['tortilla', 70], ['egg', 100], ['eggWhite', 60], ['blackBeans', 60], ['cheddar', 20], ['salsa', 40]], ['Scramble eggs and whites; warm the beans.', 'Fill the tortilla with eggs, beans, cheese and salsa; roll.']),
  M('cottage-pineapple', 'Cottage cheese with pineapple', 'Hüttenkäse mit Ananas', 'us', 'bs', [], 3, [['cottage', 200], ['pineapple', 100], ['almonds', 10]], ['Top cottage cheese with pineapple and chopped almonds.']),
  M('smoothie-bowl', 'Berry protein smoothie bowl', 'Beeren-Protein-Bowl', 'intl', 'b', [], 7, [['berries', 150], ['banana', 80], ['skyr', 150], ['whey', 15], ['granola', 20]], ['Blend frozen berries, banana, skyr and whey thick.', 'Top with granola.']),
  M('muesli-yogurt-apple', 'Muesli with yogurt and apple', 'Müsli mit Joghurt und Apfel', 'de', 'b', ['budget'], 3, [['muesli', 60], ['yogurt', 150], ['apple', 100]], ['Mix muesli with yogurt, grate or dice the apple on top.']),
  M('bircher-muesli', 'Bircher muesli', 'Bircher Müsli', 'de', 'b', ['meal-prep'], 5, [['oats', 50], ['yogurt', 150], ['apple', 100], ['milk', 50], ['almonds', 10], ['honey', 5]], ['Soak oats in yogurt and milk overnight.', 'Stir in grated apple, top with almonds and honey.']),
  M('rolls-turkey', 'Bread rolls with turkey breast', 'Brötchen mit Putenbrust', 'de', 'bl', [], 5, [['roll', 110], ['creamCheeseLight', 20], ['turkeyDeli', 60], ['cucumber', 50], ['tomato', 50]], ['Halve two rolls, spread cream cheese.', 'Top with turkey, cucumber and tomato.']),
  M('rye-egg', 'Rye bread with egg and quark', 'Vollkornbrot mit Ei und Quark', 'de', 'b', ['budget'], 10, [['vollkornbrot', 100], ['quark', 50], ['egg', 100], ['tomato', 60]], ['Boil eggs 8 minutes, slice.', 'Spread quark on bread, top with egg and tomato.']),
  M('rye-herb-quark', 'Whole-grain bread with herb quark', 'Vollkornbrot mit Kräuterquark', 'de', 'bs', ['budget'], 5, [['vollkornbrot', 100], ['quark', 125], ['cucumber', 60]], ['Season quark with chives, salt and pepper.', 'Spread on bread, add cucumber slices.']),
  M('rye-ham', 'Whole-grain bread with ham', 'Vollkornbrot mit Kochschinken', 'de', 'bl', [], 4, [['vollkornbrot', 100], ['butter', 5], ['ham', 60], ['cucumber', 50]], ['Thinly butter the bread, top with ham and cucumber.']),
  M('crispbread-cottage', 'Crispbread with cottage cheese', 'Knäckebrot mit Hüttenkäse', 'de', 'bs', [], 4, [['knaecke', 30], ['cottage', 150], ['tomato', 80], ['cucumber', 50]], ['Top crispbread with cottage cheese, tomato and cucumber.']),
  M('skyr-honey-walnuts', 'Skyr with honey and walnuts', 'Skyr mit Honig und Walnüssen', 'de', 'bs', [], 2, [['skyr', 250], ['honey', 10], ['walnuts', 15]], ['Top skyr with honey and chopped walnuts.']),
  M('french-toast', 'French toast with berries', 'Arme Ritter mit Beeren', 'intl', 'b', ['treat'], 12, [['toast', 80], ['egg', 100], ['milk', 60], ['butter', 10], ['berries', 80], ['maple', 20]], ['Dip bread in egg and milk.', 'Fry in butter; serve with berries and syrup.']),
  M('pancakes-syrup', 'Buttermilk pancakes with maple syrup', 'Pancakes mit Ahornsirup', 'us', 'b', ['treat'], 15, [['flour', 70], ['milk', 100], ['egg', 50], ['butter', 10], ['sugar', 5], ['maple', 30]], ['Whisk a batter, fry small pancakes in butter.', 'Stack and pour over the syrup.']),
  M('croissant-jam', 'Croissant with jam', 'Croissant mit Marmelade', 'de', 'b', ['treat'], 2, [['croissant', 60], ['butter', 5], ['jam', 20]], ['Warm the croissant, add butter and jam.']),
  M('kaiserschmarrn', 'Kaiserschmarrn with apple sauce', 'Kaiserschmarrn mit Apfelmus', 'de', 'bds', ['treat'], 20, [['flour', 70], ['egg', 100], ['milk', 120], ['sugar', 15], ['butter', 15], ['raisins', 15], ['appleSauce', 100]], ['Fry a thick pancake in butter, tear into pieces.', 'Caramelize with sugar and raisins; serve with apple sauce.']),
  M('milchreis-cherries', 'Rice pudding with cherries', 'Milchreis mit Kirschen', 'de', 'bs', ['budget'], 30, [['riceDry', 60], ['milk', 350], ['sugar', 10], ['cherries', 100]], ['Simmer rice in milk for ~25 minutes, stirring.', 'Sweeten and top with cherries.']),
  M('egg-muffins', 'Egg muffins with vegetables', 'Eier-Muffins mit Gemüse', 'us', 'bs', ['meal-prep'], 25, [['egg', 150], ['eggWhite', 100], ['spinach', 40], ['bellPepper', 60], ['feta', 20]], ['Whisk eggs and whites, pour over veg and feta in a muffin tin.', 'Bake 20 minutes at 180 °C; keeps 4 days.']),
  M('chia-pudding-mango', 'Chia pudding with mango', 'Chia-Pudding mit Mango', 'intl', 'bs', ['meal-prep'], 5, [['chia', 30], ['soyMilk', 250], ['mango', 100]], ['Stir chia into soy milk; rest overnight.', 'Top with mango.']),
  M('tofu-scramble', 'Tofu scramble with toast', 'Tofu-Rührei mit Toast', 'intl', 'bl', [], 12, [['tofu', 200], ['spinach', 50], ['onion', 30], ['bellPepper', 50], ['oil', 5], ['wwBread', 40]], ['Crumble tofu into a pan with onion and pepper.', 'Season with turmeric and salt; wilt in spinach.']),
  M('protein-shake-banana', 'Protein shake with banana', 'Proteinshake mit Banane', 'intl', 'bs', [], 2, [['milk', 300], ['whey', 30], ['banana', 100]], ['Blend everything with ice.']),
  M('pb-oatmeal', 'Peanut butter oatmeal', 'Haferbrei mit Erdnussbutter', 'us', 'b', ['budget'], 8, [['oats', 60], ['milk', 250], ['peanutButter', 15], ['banana', 50]], ['Cook oats in milk.', 'Swirl in peanut butter, top with banana.']),
  M('eggs-smoked-salmon', 'Scrambled eggs with smoked salmon', 'Rührei mit Räucherlachs', 'de', 'b', [], 8, [['egg', 150], ['smokedSalmon', 50], ['vollkornbrot', 50], ['butter', 5]], ['Softly scramble the eggs in butter.', 'Fold in salmon; serve with bread.']),
  M('rye-harzer', 'Rye bread with Harzer cheese', 'Vollkornbrot mit Harzer Käse', 'de', 'bs', ['budget'], 3, [['vollkornbrot', 100], ['harzer', 60], ['onion', 20]], ['Slice the cheese onto bread, add onion rings.']),
  M('bacon-eggs-toast', 'Bacon and eggs with toast', 'Eier mit Bacon und Toast', 'us', 'b', [], 10, [['egg', 100], ['bacon', 20], ['wwBread', 64], ['butter', 5]], ['Crisp the bacon, fry the eggs in the same pan.', 'Serve with buttered toast.']),
  M('breakfast-sandwich', 'Egg, ham and cheese breakfast sandwich', 'Frühstückssandwich mit Ei, Schinken und Käse', 'us', 'b', [], 8, [['roll', 60], ['egg', 50], ['eggWhite', 60], ['ham', 30], ['cheddar', 20]], ['Cook egg and whites as a flat omelette.', 'Stack on a toasted roll with ham and cheese.']),
  M('quark-oats-apple', 'Quark oatmeal with apple and cinnamon', 'Quark-Porridge mit Apfel und Zimt', 'de', 'b', ['budget'], 8, [['oats', 50], ['milk', 150], ['quark', 150], ['apple', 100]], ['Cook oats in milk, stir in quark.', 'Top with diced apple and cinnamon.']),
  M('protein-quark-banana', 'Protein quark with banana', 'Protein-Quark mit Banane', 'de', 'bs', ['budget'], 3, [['quark', 250], ['whey', 20], ['banana', 50]], ['Stir whey into quark with a splash of water.', 'Top with banana slices.']),

  // ---------- German lunch & dinner ----------
  M('chicken-rice-broccoli', 'Chicken with rice and broccoli', 'Hähnchen mit Reis und Brokkoli', 'de', 'ld', ['meal-prep', 'budget'], 25, [['chickenBreast', 150], ['rice', 200], ['broccoli', 200], ['oil', 5]], ['Cook rice; steam broccoli 5 minutes.', 'Sear seasoned chicken 6 minutes per side, slice.']),
  M('lentil-soup', 'Lentil soup', 'Linsensuppe', 'de', 'ld', ['meal-prep', 'budget'], 35, [['lentils', 250], ['potatoes', 100], ['carrot', 60], ['onion', 40], ['broth', 250], ['oil', 5]], ['Sweat onion and carrot, add potato, lentils and broth.', 'Simmer 25 minutes; finish with a splash of vinegar.']),
  M('lentil-stew-sausage', 'Lentil stew with sausage', 'Linseneintopf mit Würstchen', 'de', 'ld', ['budget'], 35, [['lentils', 200], ['potatoes', 100], ['carrot', 50], ['onion', 30], ['broth', 200], ['wiener', 80]], ['Simmer lentils, veg and broth 25 minutes.', 'Warm sliced sausages in the stew.']),
  M('split-pea-stew', 'Split pea stew with ham', 'Erbseneintopf', 'de', 'ld', ['meal-prep', 'budget'], 45, [['splitPeas', 250], ['potatoes', 100], ['carrot', 50], ['onion', 30], ['broth', 200], ['ham', 40]], ['Simmer split peas with veg and broth until soft.', 'Stir in diced ham.']),
  M('potato-soup-sausage', 'Potato soup with sausage', 'Kartoffelsuppe mit Würstchen', 'de', 'ld', ['budget'], 30, [['potatoes', 250], ['carrot', 60], ['onion', 40], ['broth', 250], ['cookingCream', 30], ['wiener', 50]], ['Simmer potatoes and veg in broth, blend partly.', 'Add cream and sliced sausage.']),
  M('chicken-noodle-soup', 'Chicken noodle soup', 'Hühnersuppe mit Nudeln', 'intl', 'ld', ['meal-prep'], 30, [['chickenBreast', 100], ['pasta', 100], ['carrot', 60], ['onion', 20], ['broth', 400]], ['Simmer chicken, carrot and onion in broth.', 'Shred chicken, add cooked noodles.']),
  M('potatoes-herb-quark', 'Potatoes with herb quark', 'Pellkartoffeln mit Kräuterquark', 'de', 'ld', ['budget'], 25, [['potatoes', 300], ['quark', 200], ['cucumber', 50], ['oil', 10]], ['Boil potatoes in their skins.', 'Serve with quark mixed with herbs and a drizzle of linseed oil.']),
  M('bauernfruehstueck', 'Farmer’s breakfast (potatoes, eggs, ham)', 'Bauernfrühstück', 'de', 'bld', ['budget'], 20, [['potatoes', 250], ['egg', 100], ['ham', 50], ['onion', 40], ['oil', 10]], ['Fry sliced boiled potatoes and onion.', 'Add ham, pour over beaten eggs and let set.']),
  M('schnitzel-fries', 'Pork schnitzel with fries', 'Schnitzel mit Pommes', 'de', 'ld', ['treat'], 25, [['porkLoin', 150], ['flour', 10], ['egg', 20], ['breadcrumbs', 20], ['oil', 15], ['fries', 150]], ['Bread the pounded pork in flour, egg and crumbs.', 'Pan-fry golden; serve with fries.']),
  M('oven-chicken-schnitzel', 'Oven chicken schnitzel with potatoes and salad', 'Hähnchenschnitzel aus dem Ofen mit Kartoffeln und Salat', 'de', 'ld', [], 30, [['chickenBreast', 150], ['breadcrumbs', 15], ['egg', 20], ['oil', 5], ['potatoes', 250], ['greens', 80], ['yogurt', 30]], ['Bread the chicken, spray with oil, bake 20 min at 200 °C.', 'Serve with potatoes and salad with yogurt dressing.']),
  M('goulash-potatoes', 'Beef goulash with potatoes', 'Rindergulasch mit Kartoffeln', 'de', 'ld', ['meal-prep'], 90, [['beefChuck', 150], ['onion', 80], ['bellPepper', 50], ['passata', 80], ['potatoes', 250], ['oil', 5]], ['Brown beef and lots of onion, add paprika and passata.', 'Braise 1½ hours; serve with potatoes.']),
  M('kaesespaetzle', 'Cheese spätzle', 'Käsespätzle', 'de', 'ld', ['treat'], 20, [['spaetzle', 250], ['emmentaler', 60], ['onion', 50], ['butter', 10]], ['Layer hot spätzle with grated cheese.', 'Top with onions fried in butter.']),
  M('turkey-mushroom-rice', 'Turkey strips in mushroom sauce with rice', 'Putengeschnetzeltes mit Champignons und Reis', 'de', 'ld', [], 25, [['turkeyBreast', 150], ['mushrooms', 150], ['onion', 40], ['cookingCream', 50], ['rice', 180], ['oil', 5]], ['Sear turkey strips, then mushrooms and onion.', 'Add cooking cream, simmer 3 minutes; serve with rice.']),
  M('maultaschen-broth', 'Maultaschen in broth', 'Maultaschen in Brühe', 'de', 'ld', ['quick'], 10, [['maultaschen', 200], ['broth', 300], ['onion', 20]], ['Heat Maultaschen gently in broth 8 minutes.', 'Top with chives.']),
  M('maultaschen-egg', 'Pan-fried Maultaschen with egg', 'Geröstete Maultaschen mit Ei', 'de', 'ld', ['treat'], 15, [['maultaschen', 250], ['egg', 100], ['oil', 10], ['onion', 40], ['greens', 60]], ['Slice and fry Maultaschen with onion.', 'Scramble in eggs; side salad.']),
  M('currywurst-fries', 'Currywurst with fries', 'Currywurst mit Pommes', 'de', 'ld', ['treat'], 15, [['bratwurst', 150], ['curryKetchup', 60], ['fries', 150]], ['Grill the sausage, slice, cover with curry ketchup.', 'Serve with fries.']),
  M('currywurst-roll', 'Currywurst with a bread roll', 'Currywurst mit Brötchen', 'de', 'lds', ['treat'], 10, [['bratwurst', 120], ['curryKetchup', 50], ['roll', 55]], ['Grill, slice, sauce, dust with curry powder.']),
  M('doner-kebab', 'Döner kebab', 'Döner Kebab', 'de', 'ld', ['treat'], 5, [['pita', 120], ['doner', 130], ['greens', 30], ['tomato', 30], ['onion', 20], ['cabbage', 30], ['tzatziki', 40]], ['Fill toasted flatbread with meat, salad and sauce.']),
  M('doner-plate-salad', 'Döner plate with salad', 'Döner Teller mit Salat', 'de', 'ld', [], 5, [['doner', 180], ['greens', 100], ['tomato', 60], ['cucumber', 60], ['onion', 20], ['cabbage', 50], ['tzatziki', 60]], ['Ask for the meat on salad instead of bread or fries.']),
  M('doner-plate-rice', 'Döner plate with rice', 'Döner Teller mit Reis', 'de', 'ld', [], 5, [['doner', 150], ['rice', 200], ['greens', 60], ['tomato', 50], ['tzatziki', 50]], ['Meat over rice with salad and sauce.']),
  M('durum', 'Dürüm döner wrap', 'Dürüm Döner', 'de', 'ld', ['treat'], 5, [['tortilla', 100], ['doner', 130], ['greens', 30], ['tomato', 30], ['onion', 20], ['tzatziki', 40]], ['Meat, salad and sauce rolled in a thin flatbread.']),
  M('gyros-plate', 'Gyros plate with fries and tzatziki', 'Gyros-Teller mit Pommes und Tzatziki', 'de', 'ld', ['treat'], 5, [['porkLoin', 180], ['oil', 15], ['fries', 150], ['tzatziki', 60], ['onion', 20], ['cabbage', 60]], ['Greek-restaurant classic: gyros, fries, tzatziki, cabbage salad.']),
  M('falafel-plate', 'Falafel plate with hummus', 'Falafel-Teller mit Hummus', 'intl', 'ld', [], 10, [['falafel', 120], ['hummus', 60], ['greens', 60], ['tomato', 60], ['cucumber', 60], ['pita', 60]], ['Warm falafel in the oven.', 'Plate with hummus, salad and pita.']),
  M('falafel-wrap', 'Falafel wrap', 'Falafel-Wrap', 'intl', 'ld', [], 8, [['tortilla', 70], ['falafel', 90], ['hummus', 30], ['greens', 30], ['tomato', 40], ['cucumber', 40]], ['Spread hummus on the wrap, add falafel and salad, roll.']),
  M('bratwurst-sauerkraut-mash', 'Bratwurst with sauerkraut and mash', 'Bratwurst mit Sauerkraut und Kartoffelpüree', 'de', 'ld', ['treat'], 25, [['bratwurst', 120], ['sauerkraut', 150], ['potatoes', 200], ['milk', 50], ['butter', 10]], ['Fry the bratwurst; warm the sauerkraut.', 'Mash potatoes with milk and butter.']),
  M('bratwurst-roll', 'Bratwurst in a roll', 'Bratwurst im Brötchen', 'de', 'ls', ['treat'], 10, [['bratwurst', 100], ['roll', 60], ['mustard', 15]], ['Grill the sausage, serve in a roll with mustard.']),
  M('leberkaese-roll', 'Leberkäse roll', 'Leberkäsbrötchen', 'de', 'ls', ['treat'], 5, [['leberkaese', 120], ['roll', 60], ['mustard', 15]], ['Warm slice of Leberkäse in a roll with sweet or hot mustard.']),
  M('meatballs-potato-salad', 'German meatballs with potato salad', 'Frikadellen mit Kartoffelsalat', 'de', 'ld', [], 35, [['beefGround', 120], ['breadcrumbs', 15], ['egg', 15], ['onion', 40], ['oil', 15], ['potatoes', 200], ['broth', 40]], ['Mix mince, crumbs, egg and onion; fry patties.', 'Dress warm potato slices with broth, vinegar and oil.']),
  M('flammkuchen', 'Tarte flambée', 'Flammkuchen', 'de', 'ld', ['treat'], 20, [['pizzaDough', 150], ['cremeFraiche', 60], ['bacon', 30], ['onion', 50]], ['Spread crème fraîche on thin dough, top with bacon and onion.', 'Bake 10 minutes at 250 °C.']),
  M('potato-pancakes-applesauce', 'Potato pancakes with apple sauce', 'Kartoffelpuffer mit Apfelmus', 'de', 'lds', ['treat'], 25, [['potatoPancakes', 200], ['appleSauce', 150]], ['Fry grated potato pancakes crisp.', 'Serve with apple sauce.']),
  M('salmon-potatoes-spinach', 'Salmon with potatoes and spinach', 'Lachs mit Kartoffeln und Spinat', 'de', 'ld', [], 25, [['salmon', 150], ['potatoes', 250], ['spinach', 150], ['oil', 5]], ['Roast salmon 12 minutes at 200 °C.', 'Serve with boiled potatoes and wilted spinach.']),
  M('pollock-potatoes-veg', 'Pollock with potatoes and vegetables', 'Seelachs mit Kartoffeln und Gemüse', 'de', 'ld', ['budget'], 25, [['whiteFish', 180], ['potatoes', 250], ['carrot', 100], ['peas', 60], ['butter', 5]], ['Pan-fry or bake the fish.', 'Serve with potatoes, carrots and peas.']),
  M('asparagus-ham-potatoes', 'Asparagus with potatoes and ham', 'Spargel mit Kartoffeln und Schinken', 'de', 'ld', [], 25, [['asparagus', 300], ['potatoes', 250], ['ham', 80], ['butter', 15]], ['Peel and simmer white asparagus 12 minutes.', 'Serve with potatoes, ham and melted butter.']),
  M('stuffed-peppers', 'Stuffed peppers', 'Gefüllte Paprika', 'de', 'ld', ['meal-prep'], 45, [['bellPepper', 250], ['beefLean', 120], ['rice', 100], ['passata', 150], ['onion', 30], ['gouda', 20]], ['Fill peppers with browned mince, rice and onion.', 'Bake in passata 30 minutes; top with cheese.']),
  M('chicken-pasta-bake', 'Chicken and broccoli pasta bake', 'Nudelauflauf mit Hähnchen und Brokkoli', 'de', 'ld', ['meal-prep'], 40, [['wholePasta', 200], ['chickenBreast', 120], ['broccoli', 150], ['milk', 100], ['gouda', 30], ['flour', 8]], ['Mix cooked pasta, chicken and broccoli with a light milk sauce.', 'Top with cheese, bake 20 minutes.']),
  M('ww-pasta-chicken-tomato', 'Whole-wheat pasta with chicken and tomato sauce', 'Vollkornnudeln mit Hähnchen und Tomatensoße', 'de', 'ld', ['meal-prep'], 20, [['wholePasta', 220], ['chickenBreast', 120], ['passata', 200], ['zucchini', 100], ['parmesan', 10], ['oil', 5]], ['Sear chicken and zucchini, add passata, simmer.', 'Toss with pasta, top with parmesan.']),
  M('beef-rice-veg-pan', 'Beef, rice and vegetable skillet', 'Rinderhack-Reis-Pfanne mit Gemüse', 'de', 'ld', ['meal-prep', 'budget'], 20, [['beefLean', 130], ['rice', 180], ['mixedVeg', 200], ['soy', 10]], ['Brown the mince, add frozen veg.', 'Stir in cooked rice and soy sauce.']),
  M('fish-sticks-potatoes-peas', 'Fish sticks with potatoes and peas', 'Fischstäbchen mit Kartoffeln und Erbsen', 'de', 'ld', ['budget'], 20, [['fishSticks', 200], ['potatoes', 200], ['peas', 100]], ['Bake fish sticks 15 minutes.', 'Serve with boiled potatoes and peas.']),
  M('mustard-eggs', 'Eggs in mustard sauce with potatoes', 'Senfeier mit Kartoffeln', 'de', 'ld', ['budget'], 25, [['egg', 120], ['potatoes', 250], ['milk', 150], ['flour', 10], ['butter', 10], ['mustard', 15]], ['Make a light roux with butter, flour and milk; add mustard.', 'Serve halved boiled eggs in the sauce with potatoes.']),

  // ---------- International & US lunch/dinner ----------
  M('chili-con-carne', 'Chili con carne with rice', 'Chili con Carne mit Reis', 'intl', 'ld', ['meal-prep'], 40, [['beefLean', 130], ['kidneyBeans', 120], ['passata', 200], ['onion', 50], ['bellPepper', 60], ['corn', 50], ['rice', 150]], ['Brown beef with onion and pepper, add spices.', 'Add beans, corn and passata; simmer 25 minutes.']),
  M('turkey-chili', 'Turkey chili', 'Puten-Chili', 'us', 'ld', ['meal-prep'], 35, [['turkeyGround', 150], ['kidneyBeans', 120], ['passata', 200], ['onion', 50], ['bellPepper', 60], ['corn', 40]], ['Brown turkey with onion and pepper, add chili spices.', 'Add beans, corn and passata; simmer 20 minutes.']),
  M('spaghetti-bolognese', 'Spaghetti bolognese', 'Spaghetti Bolognese', 'intl', 'ld', [], 35, [['pasta', 220], ['beefLean', 120], ['passata', 150], ['onion', 40], ['carrot', 40], ['parmesan', 10], ['oil', 5]], ['Brown mince with onion and carrot, add passata.', 'Simmer 20 minutes; serve over spaghetti with parmesan.']),
  M('lasagna', 'Lasagna', 'Lasagne', 'intl', 'ld', ['treat'], 75, [['pasta', 150], ['beefGround', 100], ['passata', 120], ['onion', 20], ['milk', 100], ['butter', 10], ['flour', 10], ['gouda', 30]], ['Layer pasta sheets, meat sauce and béchamel.', 'Top with cheese, bake 40 minutes.']),
  M('pizza-margherita', 'Pizza Margherita', 'Pizza Margherita', 'intl', 'ld', ['treat'], 25, [['pizzaDough', 200], ['passata', 80], ['mozzarella', 125], ['oil', 5]], ['Top dough with sauce and torn mozzarella.', 'Bake very hot 10 minutes; add basil.']),
  M('pizza-pepperoni', 'Pepperoni pizza', 'Pizza Salami', 'us', 'ld', ['treat'], 25, [['pizzaDough', 200], ['passata', 80], ['mozzarella', 100], ['pepperoni', 40]], ['Top dough with sauce, cheese and pepperoni.', 'Bake very hot 10 minutes.']),
  M('caprese-bread', 'Caprese salad with bread', 'Tomate-Mozzarella mit Brot', 'intl', 'ls', [], 5, [['mozzarella', 125], ['tomato', 200], ['oil', 10], ['roll', 60]], ['Slice tomato and mozzarella, add basil, oil, salt.', 'Serve with bread.']),
  M('greek-salad', 'Greek salad with feta', 'Griechischer Salat mit Feta', 'intl', 'ld', [], 10, [['feta', 80], ['tomato', 150], ['cucumber', 150], ['onion', 30], ['bellPepper', 60], ['olives', 30], ['oil', 10], ['pita', 60]], ['Chop vegetables, top with feta and olives.', 'Dress with oil and oregano; pita on the side.']),
  M('roast-veg-feta', 'Roasted vegetables with feta and chickpeas', 'Ofengemüse mit Feta und Kichererbsen', 'intl', 'ld', ['meal-prep'], 35, [['zucchini', 150], ['bellPepper', 150], ['onion', 60], ['chickpeas', 120], ['feta', 60], ['oil', 10]], ['Toss veg and chickpeas with oil, roast 25 minutes at 200 °C.', 'Crumble feta on top for the last 5 minutes.']),
  M('tofu-stir-fry-rice', 'Tofu vegetable stir-fry with rice', 'Tofu-Gemüsepfanne mit Reis', 'intl', 'ld', [], 20, [['tofu', 180], ['stirFryVeg', 250], ['rice', 180], ['soy', 15], ['oil', 8]], ['Crisp tofu cubes in a hot pan.', 'Add veg and soy sauce; serve on rice.']),
  M('chickpea-curry', 'Chickpea curry with rice', 'Kichererbsen-Curry mit Reis', 'intl', 'ld', ['meal-prep', 'budget'], 25, [['chickpeas', 200], ['coconutLight', 120], ['passata', 100], ['spinach', 60], ['onion', 40], ['rice', 150]], ['Soften onion with curry powder.', 'Add chickpeas, passata and coconut milk; simmer, wilt spinach.']),
  M('red-lentil-dal', 'Red lentil dal with rice', 'Rote-Linsen-Dal mit Reis', 'intl', 'ld', ['meal-prep', 'budget'], 25, [['lentils', 220], ['coconutLight', 80], ['passata', 80], ['onion', 40], ['rice', 150], ['oil', 5]], ['Simmer red lentils with onion, spices and passata 15 minutes.', 'Stir in coconut milk; serve with rice.']),
  M('chicken-curry-rice', 'Chicken curry with rice', 'Hähnchen-Curry mit Reis', 'intl', 'ld', ['meal-prep'], 25, [['chickenBreast', 150], ['coconutLight', 100], ['bellPepper', 80], ['onion', 40], ['rice', 180], ['oil', 5]], ['Sear chicken with curry paste.', 'Add pepper and light coconut milk, simmer 10 minutes; rice.']),
  M('chicken-tikka-masala', 'Chicken tikka masala with rice (restaurant-style)', 'Chicken Tikka Masala mit Reis', 'intl', 'ld', ['treat'], 35, [['chickenThigh', 150], ['passata', 120], ['cream', 50], ['butter', 10], ['onion', 50], ['yogurt', 30], ['rice', 200]], ['Grill yogurt-marinated chicken.', 'Simmer in a buttery tomato-cream sauce; serve with rice.']),
  M('chicken-wrap', 'Chicken wrap with veggies', 'Hähnchen-Wrap mit Gemüse', 'intl', 'l', [], 8, [['tortilla', 70], ['chickenBreast', 100], ['greens', 40], ['tomato', 50], ['cucumber', 40], ['yogurt', 40]], ['Fill the wrap with sliced chicken, salad and yogurt sauce; roll.']),
  M('chicken-caesar-wrap', 'Chicken Caesar wrap', 'Chicken-Caesar-Wrap', 'us', 'l', [], 8, [['tortilla', 70], ['chickenBreast', 110], ['greens', 50], ['parmesan', 10], ['caesarDressing', 20]], ['Toss romaine with dressing and parmesan.', 'Wrap with sliced chicken.']),
  M('chicken-caesar-salad', 'Chicken Caesar salad', 'Caesar Salad mit Hähnchen', 'us', 'ld', [], 10, [['chickenBreast', 150], ['greens', 150], ['parmesan', 15], ['caesarDressing', 30], ['toast', 20]], ['Toss romaine with dressing, top with chicken, parmesan and croutons.']),
  M('tuna-salad', 'Tuna salad', 'Thunfischsalat', 'us', 'lds', [], 8, [['tuna', 140], ['greekYogurt', 50], ['mayo', 10], ['cucumber', 60], ['onion', 20], ['tomato', 60], ['greens', 60]], ['Mix tuna with yogurt, mayo and onion.', 'Serve over salad with cucumber and tomato.']),
  M('tuna-sandwich', 'Tuna salad sandwich', 'Thunfisch-Sandwich', 'us', 'l', ['budget'], 5, [['wwBread', 70], ['tuna', 100], ['greekYogurt', 30], ['mayo', 10], ['greens', 20], ['tomato', 40]], ['Mix tuna with yogurt and mayo; layer on bread with salad.']),
  M('chicken-stir-fry', 'Chicken vegetable stir-fry with rice', 'Hähnchen-Gemüse-Wokpfanne mit Reis', 'intl', 'ld', ['meal-prep'], 20, [['chickenBreast', 150], ['stirFryVeg', 250], ['rice', 180], ['soy', 15], ['oil', 8]], ['Stir-fry chicken strips hot and fast.', 'Add veg and soy sauce; serve on rice.']),
  M('beef-broccoli', 'Beef and broccoli with rice', 'Rind mit Brokkoli und Reis', 'intl', 'ld', [], 20, [['beefSteak', 130], ['broccoli', 200], ['rice', 180], ['soy', 20], ['oil', 8], ['honey', 5]], ['Sear thin beef strips, then broccoli.', 'Glaze with soy and honey; serve on rice.']),
  M('shrimp-fried-rice', 'Shrimp fried rice', 'Gebratener Reis mit Garnelen', 'intl', 'ld', [], 15, [['shrimp', 120], ['rice', 220], ['egg', 50], ['peas', 60], ['carrot', 40], ['soy', 15], ['oil', 10]], ['Fry day-old rice hot with veg.', 'Push aside, scramble the egg, add shrimp and soy.']),
  M('pad-thai', 'Pad thai with shrimp', 'Pad Thai mit Garnelen', 'intl', 'ld', [], 20, [['riceNoodles', 250], ['shrimp', 100], ['egg', 50], ['peanuts', 15], ['stirFryVeg', 60], ['oil', 12], ['sugar', 10], ['soy', 15]], ['Stir-fry shrimp and egg, add soaked noodles and sauce.', 'Top with peanuts and lime.']),
  M('salmon-rice-bowl', 'Salmon rice bowl', 'Lachs-Bowl mit Reis', 'intl', 'ld', [], 20, [['salmon', 130], ['rice', 180], ['edamame', 60], ['cucumber', 60], ['avocado', 40], ['soy', 10]], ['Roast or pan-sear the salmon.', 'Build a bowl with rice, edamame, cucumber and avocado.']),
  M('poke-bowl', 'Salmon poke bowl', 'Poke Bowl mit Lachs', 'intl', 'ld', ['quick'], 10, [['salmonRaw', 120], ['rice', 180], ['edamame', 50], ['mango', 60], ['cucumber', 50], ['soy', 10]], ['Dice sushi-grade salmon, marinate in soy.', 'Arrange over rice with toppings.']),
  M('teriyaki-salmon', 'Teriyaki salmon with rice and green beans', 'Teriyaki-Lachs mit Reis und grünen Bohnen', 'intl', 'ld', [], 20, [['salmon', 150], ['rice', 180], ['greenBeans', 150], ['soy', 15], ['honey', 10]], ['Bake salmon glazed with soy and honey 12 minutes.', 'Serve with rice and beans.']),
  M('salmon-sweet-potato', 'Salmon with sweet potato and asparagus', 'Lachs mit Süßkartoffel und Spargel', 'intl', 'ld', [], 30, [['salmon', 150], ['sweetPotato', 250], ['asparagus', 150], ['oil', 5]], ['Roast sweet potato 25 minutes, add salmon and asparagus for the last 12.']),
  M('chicken-burrito-bowl', 'Chicken burrito bowl', 'Burrito Bowl mit Hähnchen', 'us', 'ld', ['meal-prep'], 20, [['chickenBreast', 150], ['rice', 150], ['blackBeans', 100], ['corn', 50], ['salsa', 60], ['greens', 40], ['avocado', 30], ['cheddar', 15]], ['Season and grill chicken.', 'Bowl it with rice, beans, corn, salsa, lettuce, avocado and cheese.']),
  M('chicken-burrito', 'Chicken burrito', 'Hähnchen-Burrito', 'us', 'ld', ['treat'], 15, [['tortilla', 110], ['chickenBreast', 120], ['rice', 120], ['blackBeans', 80], ['cheddar', 30], ['salsa', 50], ['sourCream', 30]], ['Fill a large tortilla, fold and toast seam-side down.']),
  M('chicken-quesadilla', 'Chicken quesadilla', 'Hähnchen-Quesadilla', 'us', 'ld', [], 12, [['tortilla', 140], ['chickenBreast', 100], ['cheddar', 40], ['bellPepper', 50], ['salsa', 40]], ['Fill tortillas with chicken, pepper and cheese.', 'Toast both sides until melty; salsa to dip.']),
  M('chicken-fajitas', 'Chicken fajitas', 'Hähnchen-Fajitas', 'us', 'ld', [], 20, [['chickenBreast', 150], ['bellPepper', 150], ['onion', 60], ['tortilla', 100], ['salsa', 40], ['oil', 8], ['greekYogurt', 30]], ['Sear chicken, peppers and onion with fajita spices.', 'Serve in warm tortillas with salsa and yogurt.']),
  M('shrimp-tacos', 'Shrimp tacos', 'Garnelen-Tacos', 'us', 'ld', [], 15, [['shrimp', 150], ['cornTortilla', 90], ['cabbage', 60], ['avocado', 40], ['salsa', 40], ['greekYogurt', 30]], ['Sear spiced shrimp 2 minutes.', 'Fill corn tortillas with slaw, avocado, salsa and yogurt.']),
  M('fish-tacos', 'Fish tacos', 'Fisch-Tacos', 'us', 'ld', [], 20, [['whiteFish', 150], ['cornTortilla', 90], ['cabbage', 60], ['salsa', 40], ['sourCream', 20], ['oil', 5]], ['Pan-fry spiced white fish, flake.', 'Fill tortillas with slaw, salsa and sour cream.']),
  M('turkey-sandwich', 'Turkey sandwich', 'Truthahn-Sandwich', 'us', 'l', [], 5, [['wwBread', 70], ['turkeyDeli', 90], ['cheddar', 20], ['greens', 20], ['tomato', 40], ['mustard', 10]], ['Layer turkey, cheese, lettuce and tomato with mustard.']),
  M('blt', 'BLT sandwich', 'BLT-Sandwich', 'us', 'l', [], 10, [['toast', 70], ['bacon', 25], ['greens', 20], ['tomato', 60], ['mayo', 15]], ['Crisp bacon; stack on toast with lettuce, tomato and mayo.']),
  M('grilled-chicken-salad', 'Grilled chicken salad', 'Salat mit gegrillter Hähnchenbrust', 'intl', 'ld', [], 15, [['chickenBreast', 150], ['greens', 150], ['tomato', 100], ['cucumber', 100], ['feta', 20], ['oil', 10]], ['Grill chicken, slice.', 'Serve over salad with feta and an oil-vinegar dressing.']),
  M('cobb-salad', 'Cobb salad', 'Cobb Salad', 'us', 'ld', [], 15, [['chickenBreast', 120], ['bacon', 15], ['egg', 50], ['avocado', 50], ['cheddar', 20], ['greens', 150], ['tomato', 80], ['oil', 10]], ['Arrange chicken, bacon, egg, avocado, cheese and tomato over greens.']),
  M('steak-sweet-potato', 'Steak with sweet potato and green beans', 'Steak mit Süßkartoffel und grünen Bohnen', 'us', 'd', [], 30, [['beefSteak', 180], ['sweetPotato', 250], ['greenBeans', 150], ['butter', 5]], ['Bake sweet potato; steam beans.', 'Sear steak 3–4 minutes per side, rest 5.']),
  M('turkey-meatballs-spaghetti', 'Turkey meatballs with spaghetti', 'Putenbällchen mit Spaghetti', 'us', 'ld', ['meal-prep'], 30, [['turkeyGround', 140], ['breadcrumbs', 10], ['egg', 15], ['pasta', 200], ['passata', 150], ['parmesan', 10]], ['Roll and bake meatballs 15 minutes.', 'Simmer in passata; serve over spaghetti.']),
  M('mac-and-cheese', 'Mac and cheese', 'Makkaroni mit Käse', 'us', 'ld', ['treat'], 20, [['pasta', 250], ['cheddar', 60], ['milk', 100], ['butter', 10], ['flour', 8]], ['Make a cheese sauce with butter, flour, milk and cheddar.', 'Stir in cooked macaroni.']),
  M('cheeseburger-fries', 'Cheeseburger with fries', 'Cheeseburger mit Pommes', 'us', 'ld', ['treat'], 20, [['roll', 80], ['beefGround', 120], ['cheddar', 20], ['greens', 15], ['tomato', 30], ['onion', 15], ['ketchup', 15], ['fries', 150]], ['Grill the patty, melt cheese on top.', 'Build the burger; fries on the side.']),
  M('turkey-burger-wedges', 'Turkey burger lettuce wraps with sweet potato wedges', 'Putenburger im Salatblatt mit Süßkartoffel-Wedges', 'us', 'ld', [], 30, [['turkeyGround', 150], ['greens', 60], ['tomato', 60], ['onion', 20], ['cheddar', 20], ['sweetPotato', 150], ['oil', 5]], ['Roast sweet potato wedges 25 minutes.', 'Grill the patty; wrap in lettuce with toppings.']),
  M('greek-chicken-bowl', 'Greek chicken bowl', 'Griechische Hähnchen-Bowl', 'intl', 'ld', ['meal-prep'], 20, [['chickenBreast', 150], ['rice', 150], ['cucumber', 80], ['tomato', 80], ['onion', 20], ['feta', 30], ['tzatziki', 60]], ['Grill lemon-oregano chicken.', 'Bowl with rice, salad, feta and tzatziki.']),
  M('quinoa-buddha-bowl', 'Quinoa Buddha bowl', 'Quinoa-Buddha-Bowl', 'intl', 'ld', ['meal-prep'], 30, [['quinoa', 180], ['chickpeas', 100], ['sweetPotato', 150], ['spinach', 50], ['tahini', 15]], ['Roast sweet potato and chickpeas.', 'Bowl with quinoa and spinach; drizzle tahini.']),
  M('chickpea-salad', 'Chickpea salad with feta', 'Kichererbsensalat mit Feta', 'intl', 'l', ['budget'], 10, [['chickpeas', 200], ['cucumber', 100], ['tomato', 100], ['onion', 30], ['feta', 40], ['oil', 10]], ['Toss chickpeas and chopped veg with oil, lemon and feta.']),
  M('shakshuka', 'Shakshuka with bread', 'Shakshuka mit Brot', 'intl', 'bld', ['budget'], 25, [['egg', 150], ['passata', 250], ['bellPepper', 100], ['onion', 50], ['oil', 8], ['pita', 60]], ['Simmer peppers and onion in spiced tomato sauce.', 'Crack in eggs, cover until set; serve with bread.']),
  M('pasta-primavera', 'Pasta with spring vegetables', 'Pasta Primavera', 'intl', 'ld', [], 20, [['pasta', 250], ['zucchini', 100], ['bellPepper', 80], ['peas', 50], ['parmesan', 15], ['oil', 10]], ['Sauté vegetables in oil.', 'Toss with pasta and parmesan.']),
  M('garlic-shrimp-pasta', 'Garlic shrimp pasta', 'Knoblauch-Garnelen-Pasta', 'intl', 'ld', [], 20, [['pasta', 220], ['shrimp', 150], ['spinach', 60], ['tomato', 100], ['oil', 10], ['parmesan', 10]], ['Sauté garlic and shrimp in oil.', 'Add tomatoes and spinach, toss with pasta.']),
  M('pesto-pasta', 'Pasta with pesto and tomatoes', 'Nudeln mit Pesto und Tomaten', 'intl', 'ld', ['quick'], 12, [['pasta', 250], ['pesto', 40], ['parmesan', 10], ['tomato', 80]], ['Toss hot pasta with pesto and halved tomatoes.']),
  M('tuna-tomato-pasta', 'Pasta with tuna and tomato sauce', 'Nudeln mit Thunfisch-Tomatensoße', 'intl', 'ld', ['budget'], 15, [['pasta', 250], ['tuna', 100], ['passata', 150], ['onion', 30], ['oil', 5]], ['Simmer passata with onion, stir in tuna.', 'Toss with pasta.']),
  M('chicken-sweet-potato-beans', 'Chicken with sweet potato and green beans', 'Hähnchen mit Süßkartoffel und grünen Bohnen', 'us', 'ld', ['meal-prep'], 30, [['chickenBreast', 150], ['sweetPotato', 200], ['greenBeans', 150], ['oil', 5]], ['Roast sweet potato cubes and chicken on one tray, 25 minutes.', 'Steam the beans.']),
  M('turkey-rice-bowl', 'Ground turkey rice bowl', 'Putenhack-Reis-Bowl', 'us', 'ld', ['meal-prep', 'budget'], 20, [['turkeyGround', 150], ['rice', 180], ['mixedVeg', 150], ['soy', 10]], ['Brown turkey, add frozen veg and soy.', 'Serve over rice.']),
  M('couscous-chicken-salad', 'Couscous salad with chicken', 'Couscous-Salat mit Hähnchen', 'intl', 'l', ['meal-prep'], 15, [['couscous', 200], ['chickenBreast', 120], ['cucumber', 80], ['tomato', 80], ['bellPepper', 50], ['oil', 10]], ['Soak couscous in hot broth 5 minutes.', 'Mix with chopped veg, chicken, lemon and oil.']),
  M('gnocchi-tomato-mozzarella', 'Gnocchi with tomato sauce and mozzarella', 'Gnocchi mit Tomatensoße und Mozzarella', 'intl', 'ld', [], 15, [['gnocchi', 300], ['passata', 150], ['mozzarella', 60], ['spinach', 40]], ['Pan-fry gnocchi, add passata and spinach.', 'Top with mozzarella until melted.']),
  M('sheet-pan-chicken-veg', 'Sheet-pan chicken thighs with potatoes and vegetables', 'Ofen-Hähnchen mit Kartoffeln und Gemüse', 'intl', 'd', ['meal-prep'], 40, [['chickenThigh', 150], ['potatoes', 250], ['bellPepper', 100], ['zucchini', 100], ['onion', 50], ['oil', 10]], ['Toss everything with oil and spices on a tray.', 'Roast 35 minutes at 200 °C.']),
  M('egg-salad-sandwich', 'Egg salad sandwich', 'Eiersalat-Sandwich', 'us', 'l', ['budget'], 12, [['egg', 100], ['mayo', 15], ['greekYogurt', 20], ['wwBread', 64], ['greens', 15]], ['Chop boiled eggs, mix with mayo and yogurt.', 'Serve on bread with lettuce.']),
  M('tomato-soup-grilled-cheese', 'Tomato soup with grilled cheese', 'Tomatensuppe mit Käsetoast', 'us', 'ld', ['treat'], 15, [['passata', 300], ['cream', 20], ['toast', 60], ['cheddar', 30], ['butter', 10]], ['Heat passata with a little cream and seasoning.', 'Toast a buttered cheese sandwich in a pan.']),
  M('minestrone', 'Minestrone', 'Minestrone', 'intl', 'ld', ['meal-prep', 'budget'], 35, [['kidneyBeans', 80], ['pasta', 80], ['zucchini', 80], ['carrot', 50], ['passata', 150], ['broth', 250], ['onion', 30], ['oil', 5], ['parmesan', 5]], ['Simmer vegetables, beans and passata in broth 20 minutes.', 'Add cooked pasta; top with parmesan.']),

  // ---------- Snacks ----------
  M('apple-peanut-butter', 'Apple with peanut butter', 'Apfel mit Erdnussbutter', 'us', 's', [], 2, [['apple', 180], ['peanutButter', 16]], ['Slice the apple, dip in peanut butter.']),
  M('boiled-eggs', 'Two boiled eggs', 'Zwei gekochte Eier', 'intl', 'bs', ['budget'], 10, [['egg', 100]], ['Boil 8–9 minutes, cool in cold water.']),
  M('hummus-veggie-sticks', 'Hummus with veggie sticks', 'Hummus mit Gemüsesticks', 'intl', 's', [], 5, [['hummus', 60], ['carrot', 80], ['cucumber', 80], ['bellPepper', 60]], ['Cut veg into sticks, dip in hummus.']),
  M('edamame', 'Edamame', 'Edamame', 'intl', 's', [], 5, [['edamame', 150]], ['Boil 4 minutes, sprinkle with salt.']),
  M('rice-cakes-pb', 'Rice cakes with peanut butter', 'Reiswaffeln mit Erdnussbutter', 'intl', 's', [], 2, [['riceCakes', 20], ['peanutButter', 15], ['banana', 50]], ['Spread peanut butter on two rice cakes, top with banana.']),
  M('beef-jerky', 'Beef jerky', 'Beef Jerky', 'us', 's', [], 1, [['jerky', 40]], ['Straight from the bag.']),
  M('protein-bar', 'Protein bar', 'Proteinriegel', 'intl', 's', [], 1, [['proteinBar', 60]], ['Unwrap and eat.']),
  M('almonds', 'Handful of almonds', 'Eine Handvoll Mandeln', 'intl', 's', [], 1, [['almonds', 30]], ['About 25 almonds.']),
  M('dark-chocolate', 'Dark chocolate', 'Zartbitterschokolade', 'intl', 's', ['treat'], 1, [['darkChocolate', 25]], ['Two or three squares, slowly.']),
  M('ice-cream', 'Vanilla ice cream', 'Vanilleeis', 'intl', 's', ['treat'], 1, [['iceCream', 130]], ['Two scoops.']),
  M('apple-strudel', 'Apple strudel', 'Apfelstrudel', 'de', 's', ['treat'], 2, [['apfelstrudel', 150]], ['One slice, warm.']),
  M('cheesecake', 'German cheesecake', 'Käsekuchen', 'de', 's', ['treat'], 1, [['kaesekuchen', 130]], ['One slice.']),
  M('butter-pretzel', 'Butter pretzel', 'Butterbrezel', 'de', 's', ['treat'], 2, [['pretzel', 80], ['butter', 10]], ['Halve the pretzel, spread with butter.']),
  M('turkey-rollups', 'Turkey and cheese roll-ups', 'Putenbrust-Röllchen mit Käse', 'intl', 's', [], 3, [['turkeyDeli', 60], ['gouda', 20], ['cucumber', 60]], ['Roll turkey and cheese around cucumber sticks.']),
  M('greek-yogurt-honey', 'Greek yogurt with honey', 'Griechischer Joghurt mit Honig', 'intl', 's', [], 1, [['greekYogurt', 170], ['honey', 10]], ['Drizzle honey over yogurt.']),
  M('pbj', 'PB&J sandwich', 'Erdnussbutter-Marmeladen-Sandwich', 'us', 'ls', ['treat'], 3, [['wwBread', 64], ['peanutButter', 32], ['jam', 20]], ['Spread peanut butter and jam between two slices.']),
  M('nachos', 'Nachos with cheese and salsa', 'Nachos mit Käse und Salsa', 'us', 's', ['treat'], 8, [['tortillaChips', 60], ['cheddar', 40], ['salsa', 60]], ['Top chips with cheese, bake until melted; salsa to dip.']),
  M('fruit-salad', 'Fruit salad', 'Obstsalat', 'intl', 'bs', [], 8, [['apple', 100], ['banana', 80], ['orange', 100], ['berries', 80]], ['Chop fruit, add a squeeze of lemon.']),
  M('banana-milk', 'Banana and a glass of milk', 'Banane und ein Glas Milch', 'intl', 's', ['budget'], 1, [['banana', 120], ['milk', 250]], ['Simple pre-workout fuel.']),
  M('quark-shake', 'Quark shake with berries', 'Quark-Shake mit Beeren', 'de', 'bs', ['budget'], 3, [['quark', 200], ['milk', 200], ['berries', 100]], ['Blend until smooth.']),
  M('cottage-cucumber', 'Cottage cheese with cucumber', 'Hüttenkäse mit Gurke', 'intl', 's', ['budget'], 2, [['cottage', 200], ['cucumber', 100]], ['Season with pepper and chives.']),
  M('skyr-cup', 'Skyr with berries', 'Skyr mit Beeren', 'de', 's', [], 2, [['skyr', 200], ['berries', 80]], ['Top skyr with berries.']),
  M('smoked-salmon-crispbread', 'Crispbread with smoked salmon', 'Knäckebrot mit Räucherlachs', 'de', 's', [], 3, [['knaecke', 20], ['creamCheeseLight', 20], ['smokedSalmon', 50]], ['Spread cream cheese on crispbread, add salmon.']),
  M('trail-mix', 'Nuts and raisins', 'Studentenfutter', 'de', 's', [], 1, [['almonds', 15], ['walnuts', 10], ['raisins', 15]], ['A small handful.']),
];

// ---------- helpers ----------

export function mealName(meal: Meal, region: FoodRegion): string {
  return region === 'de' ? meal.nameDe : meal.name;
}

export function servingLabel(meal: Meal, region: FoodRegion = 'us'): string {
  return region === 'de' ? `1 Portion (${meal.grams} g)` : `1 serving (${meal.grams} g)`;
}

/** Lowercase, drop accents, fold German umlaut spellings (ö/oe → o, ß → ss). */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u');
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Typical kcal for a meal slot when no explicit target is given. */
const DEFAULT_TARGET: Record<MealType, number> = { breakfast: 500, lunch: 700, dinner: 700, snacks: 250 };

export interface SuggestOptions {
  meal?: MealType;
  /** Calories left for the day; suggestions never exceed this unless nothing fits. */
  kcalLeft: number;
  /** Protein left for the day in grams. */
  proteinLeft: number;
  region: FoodRegion;
  n?: number;
  /** Only meals with all of these tags. */
  tags?: MealTag[];
  /** Meal ids to leave out (e.g. already suggested). */
  exclude?: string[];
  /** Ideal size of this meal in kcal (default: a typical portion for the slot, capped by kcalLeft). */
  kcalTarget?: number;
  /** Variety seed; defaults to today's date so answers change day to day. */
  seed?: string;
}

/**
 * Meals that fit the remaining budget, best first. Scores closeness to the
 * calorie target, protein density (weighted by how much protein is still
 * needed), a nudge toward the user's region, a penalty for treats unless asked
 * for, and a small date-seeded shuffle for day-to-day variety.
 */
export function suggestMeals(opts: SuggestOptions): Meal[] {
  const { meal, region, n = 3, tags = [], exclude = [], seed = todayKey() } = opts;
  const kcalLeft = Math.max(0, opts.kcalLeft);
  const proteinLeft = Math.max(0, opts.proteinLeft);
  const slotTarget = meal ? DEFAULT_TARGET[meal] : 600;
  const target = Math.max(120, Math.min(opts.kcalTarget ?? slotTarget, kcalLeft || 120));
  // Grams of protein per 100 kcal still needed; ~5 is a typical high-protein diet.
  const needDensity = kcalLeft > 0 ? (proteinLeft / kcalLeft) * 100 : proteinLeft > 0 ? 10 : 0;
  const proteinWeight = Math.min(2, proteinLeft / 50) * (needDensity > 5 ? 1.5 : 1);

  const ok = (m: Meal) => tags.every((t) => m.tags.includes(t)) && !exclude.includes(m.id);
  const pool = MEALS.filter((m) => (!meal || m.meals.includes(meal)) && ok(m));
  const cap = Math.max(kcalLeft, 120);
  let candidates = pool.filter((m) => m.nutrients.calories <= cap);
  // Too little left for a full meal in this slot: offer lighter dishes from any slot,
  // and only when even those don't fit, the smallest ones for the slot.
  if (candidates.length < n) candidates = [...candidates, ...MEALS.filter((m) => ok(m) && !candidates.includes(m) && m.nutrients.calories <= cap)];
  if (!candidates.length) candidates = [...pool].sort((a, b) => a.nutrients.calories - b.nutrients.calories).slice(0, n);

  const score = (m: Meal) => {
    const k = m.nutrients.calories;
    const off = (k - target) / target;
    // Being under the target is better than over it, but both cost.
    const fit = off > 0 ? -3 * off : -1.8 * -off;
    const density = (m.nutrients.protein / Math.max(1, k)) * 100; // g per 100 kcal
    const protein = Math.min(1.5, proteinWeight) * (Math.min(density, 10) / 10);
    const home = m.cuisine === region ? 0.3 : m.cuisine === 'intl' ? 0.15 : 0;
    const treat = m.tags.includes('treat') && !tags.includes('treat') ? -0.6 : 0;
    const jitter = hash(`${seed}|${m.id}`) * 0.45;
    return fit + protein + home + treat + jitter;
  };

  const ranked = candidates.map((m) => ({ m, s: score(m) })).sort((a, b) => b.s - a.s);
  // Variety: avoid two picks built on the same main ingredient.
  const out: Meal[] = [];
  const mains = new Set<string>();
  for (const { m } of ranked) {
    const main = m.ingredients[0].key;
    if (mains.has(main)) continue;
    mains.add(main);
    out.push(m);
    if (out.length >= n) return out;
  }
  for (const { m } of ranked) {
    if (out.length >= n) break;
    if (!out.includes(m)) out.push(m);
  }
  return out;
}

/**
 * Case-, accent- and umlaut-insensitive search over English and German names,
 * ingredients and tags. Every word must match; name hits rank first, and
 * meals from the user's region win ties.
 */
export function searchMeals(query: string, region: FoodRegion): Meal[] {
  const words = normalizeText(query).split(/[^a-z0-9&]+/).filter((w) => w.length > 1 || /\d/.test(w));
  if (!words.length) return [];
  const hayOf = (m: Meal) => normalizeText(`${m.name} ${m.nameDe} ${m.ingredients.map((i) => `${i.name} ${i.nameDe}`).join(' ')} ${m.tags.join(' ')}`);
  const namesOf = (m: Meal) => normalizeText(`${m.name} ${m.nameDe}`);
  let hits = MEALS.filter((m) => words.every((w) => hayOf(m).includes(w)));
  if (!hits.length && words.length >= 3) {
    // Loose fallback for long queries: all but one word in the name.
    hits = MEALS.filter((m) => words.filter((w) => namesOf(m).includes(w)).length >= words.length - 1);
  }
  const q = normalizeText(query).trim();
  const rank = (m: Meal) => {
    const own = normalizeText(mealName(m, region));
    const names = namesOf(m);
    if (own.startsWith(q) || normalizeText(region === 'de' ? m.name : m.nameDe).startsWith(q)) return 0;
    if (words.every((w) => names.includes(w))) return 1;
    if (words.some((w) => names.includes(w))) return 2;
    return 3;
  };
  return hits
    .map((m) => ({ m, r: rank(m) }))
    .sort((a, b) => a.r - b.r || Number(b.m.cuisine === region) - Number(a.m.cuisine === region) || mealName(a.m, region).length - mealName(b.m, region).length)
    .map((x) => x.m);
}

/**
 * A meal as a loggable Food: one serving as the base, plus 100 g and 1 g so it
 * can be weighed. Uses source 'builtin' (shown as "Common food"), the closest
 * existing FoodSource for curated offline data.
 */
export function mealToFood(meal: Meal, region: FoodRegion): Food {
  const g = meal.grams;
  return {
    id: `meal:${meal.id}`,
    name: mealName(meal, region),
    source: 'builtin',
    nutrients: { ...meal.nutrients },
    servings: [
      { label: servingLabel(meal, region), factor: 1 },
      { label: '100 g', factor: 100 / g },
      { label: '1 g', factor: 1 / g },
    ],
    // Shown as "What's on the plate" on the food screen.
    components: meal.ingredients.map((i) => {
      const n = mealNutrients({ ingredients: [i] });
      return { name: region === 'de' ? i.nameDe : i.name, grams: i.grams, calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fat };
    }),
    note: 'Computed from USDA FoodData Central / BLS reference values for the ingredients.',
  };
}

export function findMeal(id: string): Meal | undefined {
  return MEALS.find((m) => m.id === id);
}
