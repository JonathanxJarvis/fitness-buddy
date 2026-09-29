#!/usr/bin/env node
/*
 * Downloads a free food photo for every meal in src/lib/meals.ts.
 *
 *   npm run photos                 fetch photos for meals that don't have one yet
 *   npm run photos -- --force      fetch again, replacing existing photos
 *   npm run photos -- --only shakshuka,lasagna
 *   npm run photos -- --list       print the search queries, no network
 *
 * Sources, all free for commercial use without credit: Pixabay when
 * PIXABAY_API_KEY is set (free key at pixabay.com/api/docs; Pixabay asks that
 * images be downloaded, not hotlinked, which is what this does), then Pexels
 * when PEXELS_API_KEY is set. Without any key it falls back to Openverse
 * (CC0 / Public Domain Mark only), whose food matches are unreliable.
 *
 * Writes assets/meals/<mealId>.jpg, assets/meals/credits.json (for our
 * records) and src/components/meal/mealPhotos.ts, which the app imports.
 * Plain Node 18+, no dependencies; works on Windows, macOS and Linux.
 */
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEALS_TS = join(ROOT, 'src', 'lib', 'meals.ts');
const PHOTO_DIR = join(ROOT, 'assets', 'meals');
const CREDITS = join(PHOTO_DIR, 'credits.json');
const MODULE = join(ROOT, 'src', 'components', 'meal', 'mealPhotos.ts');
const MAX_BYTES = 1.5 * 1024 * 1024;
const MIN_WIDTH = 640;
const OPENVERSE_DELAY_MS = 3500; // anonymous Openverse allows roughly 20 requests a minute
const UA = 'FitnessBuddyPhotoFetcher/1.0 (meal photos for a fitness app)';

/** Search queries per meal, most specific first. Short queries work best on Openverse. */
export const PHOTO_QUERIES = {
  'quark-berries': ['quark berries bowl', 'yogurt berries bowl'],
  'oats-skyr-blueberries': ['oatmeal blueberries yogurt', 'oatmeal blueberries'],
  'overnight-oats': ['overnight oats jar', 'overnight oats'],
  'protein-porridge': ['porridge banana', 'oatmeal banana bowl'],
  'egg-white-omelette': ['spinach omelette', 'omelette plate'],
  'veggie-omelette': ['vegetable omelette', 'omelette'],
  'scrambled-eggs-rye': ['scrambled eggs toast', 'scrambled eggs'],
  'protein-pancakes': ['pancakes berries', 'pancakes'],
  'greek-yogurt-parfait': ['yogurt parfait granola', 'yogurt granola berries'],
  'avocado-toast-eggs': ['avocado toast egg', 'avocado toast'],
  'pb-banana-toast': ['peanut butter banana toast', 'peanut butter toast'],
  'bagel-lox': ['bagel smoked salmon', 'bagel lox'],
  'breakfast-burrito': ['breakfast burrito', 'burrito'],
  'cottage-pineapple': ['cottage cheese pineapple', 'cottage cheese'],
  'smoothie-bowl': ['smoothie bowl berries', 'smoothie bowl'],
  'muesli-yogurt-apple': ['muesli yogurt apple', 'muesli bowl'],
  'bircher-muesli': ['bircher muesli', 'muesli apple'],
  'rolls-turkey': ['bread roll sandwich turkey', 'bread roll sandwich'],
  'rye-egg': ['rye bread egg', 'egg sandwich open'],
  'rye-herb-quark': ['bread cream cheese chives', 'rye bread spread'],
  'rye-ham': ['ham sandwich rye bread', 'ham sandwich'],
  'crispbread-cottage': ['crispbread cottage cheese', 'crispbread'],
  'skyr-honey-walnuts': ['yogurt honey walnuts', 'yogurt honey'],
  'french-toast': ['french toast berries', 'french toast'],
  'pancakes-syrup': ['pancakes maple syrup', 'pancake stack'],
  'croissant-jam': ['croissant jam', 'croissant'],
  kaiserschmarrn: ['kaiserschmarrn', 'shredded pancake'],
  'milchreis-cherries': ['rice pudding cherries', 'rice pudding'],
  'egg-muffins': ['egg muffins', 'frittata muffins'],
  'chia-pudding-mango': ['chia pudding mango', 'chia pudding'],
  'tofu-scramble': ['tofu scramble', 'tofu scramble toast'],
  'protein-shake-banana': ['banana smoothie glass', 'banana milkshake'],
  'pb-oatmeal': ['oatmeal peanut butter', 'oatmeal banana'],
  'eggs-smoked-salmon': ['scrambled eggs salmon', 'eggs smoked salmon'],
  'rye-harzer': ['cheese bread onion', 'cheese sandwich rye'],
  'bacon-eggs-toast': ['bacon eggs toast', 'bacon and eggs'],
  'breakfast-sandwich': ['breakfast sandwich egg cheese', 'egg sandwich'],
  'quark-oats-apple': ['oatmeal apple cinnamon', 'porridge apple'],
  'protein-quark-banana': ['yogurt banana bowl', 'quark banana'],
  'chicken-rice-broccoli': ['chicken rice broccoli', 'chicken rice'],
  'lentil-soup': ['lentil soup', 'lentil soup bowl'],
  'lentil-stew-sausage': ['lentil stew sausage', 'lentil stew'],
  'split-pea-stew': ['split pea soup', 'pea soup'],
  'potato-soup-sausage': ['potato soup sausage', 'potato soup'],
  'chicken-noodle-soup': ['chicken noodle soup', 'noodle soup'],
  'potatoes-herb-quark': ['potatoes quark', 'boiled potatoes herbs'],
  bauernfruehstueck: ['bauernfrühstück', 'fried potatoes eggs'],
  'schnitzel-fries': ['schnitzel fries', 'schnitzel'],
  'oven-chicken-schnitzel': ['chicken schnitzel', 'breaded chicken potatoes'],
  'goulash-potatoes': ['goulash', 'beef stew potatoes'],
  kaesespaetzle: ['käsespätzle', 'cheese spaetzle'],
  'kaesespaetzle-light': ['spaetzle cheese', 'spätzle'],
  'linsen-spaetzle': ['linsen spätzle', 'lentils spaetzle'],
  'turkey-mushroom-rice': ['mushroom cream sauce rice', 'geschnetzeltes'],
  'maultaschen-broth': ['maultaschen', 'dumplings broth'],
  'maultaschen-egg': ['maultaschen', 'fried dumplings egg'],
  'currywurst-fries': ['currywurst', 'currywurst fries'],
  'currywurst-roll': ['currywurst', 'sausage curry ketchup'],
  'doner-kebab': ['döner kebab', 'doner kebab'],
  'doner-plate-salad': ['doner kebab plate', 'kebab salad'],
  'doner-plate-rice': ['kebab rice plate', 'doner kebab plate'],
  durum: ['durum wrap', 'kebab wrap'],
  'gyros-plate': ['gyros plate', 'gyros'],
  'falafel-plate': ['falafel plate hummus', 'falafel'],
  'falafel-wrap': ['falafel wrap', 'falafel'],
  'bratwurst-sauerkraut-mash': ['bratwurst sauerkraut', 'sausage mashed potatoes'],
  'bratwurst-roll': ['bratwurst bun', 'bratwurst'],
  'leberkaese-roll': ['leberkäse', 'leberkase'],
  'meatballs-potato-salad': ['frikadellen', 'meatballs potato salad'],
  flammkuchen: ['flammkuchen', 'tarte flambee'],
  'potato-pancakes-applesauce': ['potato pancakes applesauce', 'potato pancakes'],
  'salmon-potatoes-spinach': ['salmon potatoes', 'salmon fillet plate'],
  'pollock-potatoes-veg': ['fish fillet potatoes vegetables', 'white fish plate'],
  'asparagus-ham-potatoes': ['white asparagus ham potatoes', 'white asparagus'],
  'stuffed-peppers': ['stuffed peppers', 'stuffed bell peppers'],
  'chicken-pasta-bake': ['pasta bake', 'baked pasta casserole'],
  'ww-pasta-chicken-tomato': ['pasta chicken tomato', 'pasta tomato sauce'],
  'beef-rice-veg-pan': ['beef rice skillet', 'ground beef rice'],
  'fish-sticks-potatoes-peas': ['fish fingers peas', 'fish sticks'],
  'mustard-eggs': ['eggs mustard sauce', 'boiled eggs sauce potatoes'],
  'chili-con-carne': ['chili con carne', 'chili rice'],
  'turkey-chili': ['chili bowl', 'chili beans'],
  'spaghetti-bolognese': ['spaghetti bolognese', 'spaghetti meat sauce'],
  lasagna: ['lasagna', 'lasagne'],
  'pizza-margherita': ['pizza margherita', 'pizza'],
  'pizza-pepperoni': ['pepperoni pizza', 'salami pizza'],
  'caprese-bread': ['caprese salad', 'tomato mozzarella'],
  'salade-nicoise': ['salade nicoise', 'tuna salad eggs'],
  'greek-salad': ['greek salad', 'greek salad feta'],
  'roast-veg-feta': ['roasted vegetables feta', 'roasted vegetables'],
  'tofu-stir-fry-rice': ['tofu stir fry', 'tofu vegetables'],
  'chickpea-curry': ['chickpea curry', 'chana masala'],
  'red-lentil-dal': ['dal rice', 'lentil dal'],
  'chicken-curry-rice': ['chicken curry rice', 'chicken curry'],
  'chicken-tikka-masala': ['chicken tikka masala', 'butter chicken'],
  'chicken-wrap': ['chicken wrap', 'wrap sandwich'],
  'chicken-caesar-wrap': ['chicken caesar wrap', 'chicken wrap'],
  'chicken-caesar-salad': ['chicken caesar salad', 'caesar salad'],
  'tuna-salad': ['tuna salad', 'tuna salad bowl'],
  'tuna-sandwich': ['tuna sandwich', 'tuna salad sandwich'],
  'chicken-stir-fry': ['chicken stir fry', 'stir fry rice'],
  'beef-broccoli': ['beef broccoli', 'beef and broccoli'],
  'shrimp-fried-rice': ['shrimp fried rice', 'fried rice'],
  'pad-thai': ['pad thai', 'pad thai shrimp'],
  'salmon-rice-bowl': ['salmon rice bowl', 'salmon bowl'],
  'poke-bowl': ['poke bowl', 'salmon poke'],
  'teriyaki-salmon': ['teriyaki salmon', 'salmon rice green beans'],
  'salmon-sweet-potato': ['salmon sweet potato', 'salmon asparagus'],
  'chicken-burrito-bowl': ['burrito bowl', 'chicken rice beans bowl'],
  'chicken-burrito': ['chicken burrito', 'burrito'],
  'chicken-quesadilla': ['quesadilla', 'chicken quesadilla'],
  'chicken-fajitas': ['fajitas', 'chicken fajitas'],
  'shrimp-tacos': ['shrimp tacos', 'tacos'],
  'fish-tacos': ['fish tacos', 'tacos'],
  'turkey-sandwich': ['turkey sandwich', 'sandwich'],
  blt: ['blt sandwich', 'bacon lettuce tomato sandwich'],
  'grilled-chicken-salad': ['grilled chicken salad', 'chicken salad'],
  'cobb-salad': ['cobb salad', 'chicken egg avocado salad'],
  'steak-sweet-potato': ['steak sweet potato', 'steak dinner'],
  'turkey-meatballs-spaghetti': ['spaghetti meatballs', 'meatballs pasta'],
  'mac-and-cheese': ['mac and cheese', 'macaroni cheese'],
  'cheeseburger-fries': ['cheeseburger fries', 'cheeseburger'],
  'turkey-burger-wedges': ['lettuce wrap burger', 'sweet potato wedges'],
  'greek-chicken-bowl': ['greek chicken bowl', 'chicken rice bowl'],
  'quinoa-buddha-bowl': ['buddha bowl', 'quinoa bowl'],
  'chickpea-salad': ['chickpea salad', 'chickpea feta salad'],
  shakshuka: ['shakshuka', 'eggs tomato sauce pan'],
  'pasta-primavera': ['pasta primavera', 'pasta vegetables'],
  'garlic-shrimp-pasta': ['shrimp pasta', 'garlic shrimp pasta'],
  'pesto-pasta': ['pesto pasta', 'pasta pesto tomatoes'],
  'tuna-tomato-pasta': ['tuna pasta', 'pasta tomato sauce'],
  'chicken-sweet-potato-beans': ['chicken sweet potato', 'chicken green beans'],
  'turkey-rice-bowl': ['ground turkey rice bowl', 'rice bowl'],
  'couscous-chicken-salad': ['couscous salad', 'couscous chicken'],
  'gnocchi-tomato-mozzarella': ['gnocchi tomato', 'gnocchi'],
  'sheet-pan-chicken-veg': ['sheet pan chicken', 'roast chicken thighs potatoes'],
  'egg-salad-sandwich': ['egg salad sandwich', 'egg sandwich'],
  'tomato-soup-grilled-cheese': ['tomato soup grilled cheese', 'tomato soup'],
  minestrone: ['minestrone', 'vegetable soup'],
  'apple-peanut-butter': ['apple peanut butter', 'apple slices'],
  'boiled-eggs': ['boiled eggs', 'hard boiled eggs'],
  'hummus-veggie-sticks': ['hummus vegetables', 'hummus'],
  edamame: ['edamame', 'edamame bowl'],
  'rice-cakes-pb': ['rice cakes peanut butter', 'rice cakes'],
  'beef-jerky': ['beef jerky', 'jerky'],
  'protein-bar': ['protein bar', 'granola bar'],
  almonds: ['almonds bowl', 'almonds'],
  'dark-chocolate': ['dark chocolate', 'chocolate pieces'],
  'ice-cream': ['vanilla ice cream', 'ice cream bowl'],
  'apple-strudel': ['apple strudel', 'apfelstrudel'],
  cheesecake: ['cheesecake', 'käsekuchen'],
  'butter-pretzel': ['pretzel', 'brezel'],
  'turkey-rollups': ['turkey roll ups', 'deli meat cheese rolls'],
  'greek-yogurt-honey': ['greek yogurt honey', 'yogurt honey'],
  pbj: ['peanut butter jelly sandwich', 'peanut butter sandwich'],
  nachos: ['nachos', 'nachos cheese'],
  'fruit-salad': ['fruit salad', 'fruit bowl'],
  'banana-milk': ['banana milk', 'banana glass milk'],
  'quark-shake': ['berry smoothie', 'berry shake'],
  'cottage-cucumber': ['cottage cheese cucumber', 'cottage cheese'],
  'skyr-cup': ['yogurt berries', 'skyr'],
  'smoked-salmon-crispbread': ['smoked salmon crispbread', 'smoked salmon cracker'],
  'trail-mix': ['trail mix', 'nuts raisins'],
};

const GOOD_WORDS = ['food', 'overhead', 'top view', 'flat lay', 'flatlay', 'plate', 'bowl', 'meal', 'dish', 'breakfast', 'lunch', 'dinner', 'homemade', 'delicious'];
const BAD_WORDS = ['menu', 'sign', 'logo', 'illustration', 'drawing', 'clipart', 'vector', 'poster', 'package', 'packaging', 'label', 'advert', 'person', 'people', 'man', 'woman', 'girl', 'boy', 'child', 'market', 'shop', 'store', 'restaurant exterior', 'recipe card', 'screenshot', 'cat', 'dog'];

// ---------- pure helpers (tested offline) ----------

/** Meal ids and English names from src/lib/meals.ts, in library order. */
export function parseMeals(source) {
  const out = [];
  const re = /\bM\(\s*'([a-z0-9-]+)',\s*'((?:[^'\\]|\\.)*)'/g;
  for (let m; (m = re.exec(source)); ) out.push({ id: m[1], name: m[2].replace(/\\'/g, "'") });
  return out;
}

/** Search queries for a meal: the map first, then the English name without the fine print. */
export function queriesFor(meal) {
  const byName = meal.name.replace(/\(.*?\)/g, '').replace(/['’]s?\b/g, '').replace(/\b(with|and|a|an|the|of|on|in)\b/gi, ' ').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  return [...new Set([...(PHOTO_QUERIES[meal.id] ?? []), byName].filter(Boolean))];
}

/** Higher is better: landscape, a reasonable size, food-looking tags, no signs or people. */
export function scoreImage(img) {
  const w = img.width ?? 0;
  const h = img.height ?? 0;
  if (w && w < MIN_WIDTH) return -Infinity;
  if (img.filesize && img.filesize > MAX_BYTES) return -Infinity;
  if (img.filetype && !/^jpe?g$/i.test(img.filetype)) return -Infinity;
  let s = 0;
  const ratio = w && h ? w / h : 0;
  if (ratio >= 1.2 && ratio <= 1.9) s += 3;
  else if (ratio > 1 && ratio < 2.4) s += 1.5;
  else if (ratio) s -= 2;
  if (w >= 1000 && w <= 4200) s += 1;
  const text = `${img.title ?? ''} ${(img.tags ?? []).map((t) => (typeof t === 'string' ? t : t.name)).join(' ')}`.toLowerCase();
  for (const word of GOOD_WORDS) if (text.includes(word)) s += 0.4;
  for (const word of BAD_WORDS) if (new RegExp(`\\b${word}\\b`).test(text)) s -= 2;
  return s;
}

export function rankImages(results) {
  return results
    .map((img) => ({ img, s: scoreImage(img) }))
    .filter((x) => x.s > -Infinity)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.img);
}

export function openverseUrl(query) {
  const p = new URLSearchParams({ q: query, license: 'cc0,pdm', category: 'photograph', aspect_ratio: 'wide', mature: 'false', page_size: '20' });
  return `https://api.openverse.org/v1/images/?${p}`;
}

/** The generated module the app imports. Keys are meal ids with a photo on disk. */
export function renderPhotosModule(ids) {
  const lines = [...ids].sort().map((id) => `  '${id}': require('../../../assets/meals/${id}.jpg'),`);
  return [
    '// Generated by scripts/fetch-meal-photos.mjs (npm run photos). Do not edit by hand.',
    lines.length ? `export const MEAL_PHOTOS: Record<string, number> = {\n${lines.join('\n')}\n};` : 'export const MEAL_PHOTOS: Record<string, number> = {};',
    '',
  ].join('\n');
}

export const isJpeg = (buf) => buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

// ---------- network ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastOpenverse = 0;

async function getJson(url, headers = {}, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', ...headers }, signal: AbortSignal.timeout(20000) });
    if (res.status === 429) {
      const wait = Math.min(120, Number(res.headers.get('retry-after')) || 30 * (i + 1));
      console.log(`  rate limited, waiting ${wait}s…`);
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }
  throw new Error('Still rate limited. Try again later; photos already saved are kept.');
}

async function searchOpenverse(query) {
  const wait = lastOpenverse + OPENVERSE_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastOpenverse = Date.now();
  const data = await getJson(openverseUrl(query));
  return rankImages(data.results ?? []).map((img) => ({
    url: img.url,
    title: img.title ?? '',
    creator: img.creator ?? '',
    license: `${img.license ?? ''}${img.license_version ? ` ${img.license_version}` : ''}`.trim(),
    source: img.foreign_landing_url ?? img.url,
    via: 'openverse',
  }));
}

async function searchPexels(query, key) {
  const p = new URLSearchParams({ query, orientation: 'landscape', size: 'medium', per_page: '15' });
  const data = await getJson(`https://api.pexels.com/v1/search?${p}`, { authorization: key });
  return (data.photos ?? []).map((ph) => ({
    url: ph.src?.large ?? ph.src?.medium,
    title: ph.alt ?? '',
    creator: ph.photographer ?? '',
    license: 'Pexels License',
    source: ph.url,
    via: 'pexels',
  })).filter((c) => c.url);
}

async function searchPixabay(query, key) {
  const p = new URLSearchParams({ key, q: query, image_type: 'photo', category: 'food', orientation: 'horizontal', safesearch: 'true', per_page: '20' });
  const data = await getJson(`https://pixabay.com/api/?${p}`);
  return (data.hits ?? []).map((h) => ({
    url: h.largeImageURL ?? h.webformatURL,
    title: h.tags ?? '',
    creator: h.user ?? '',
    license: 'Pixabay Content License',
    source: h.pageURL,
    via: 'pixabay',
  })).filter((c) => c.url);
}

async function download(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const len = Number(res.headers.get('content-length'));
  if (len && len > MAX_BYTES) throw new Error('too big');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error('too big');
  if (!isJpeg(buf)) throw new Error('not a JPEG');
  return buf;
}

async function tryCandidates(candidates, file) {
  for (const c of candidates.slice(0, 8)) {
    try {
      writeFileSync(file, await download(c.url));
      return c;
    } catch {
      // Next result: too big, not a JPEG, or the host is down.
    }
  }
  return null;
}

// ---------- main ----------

function readCredits() {
  try {
    return JSON.parse(readFileSync(CREDITS, 'utf8'));
  } catch {
    return {};
  }
}

function writeModule() {
  const ids = existsSync(PHOTO_DIR) ? readdirSync(PHOTO_DIR).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)) : [];
  writeFileSync(MODULE, renderPhotosModule(ids));
  return ids.length;
}

export async function main(argv) {
  const force = argv.includes('--force');
  const onlyArg = argv.find((a) => a.startsWith('--only'));
  const only = onlyArg ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : argv[argv.indexOf(onlyArg) + 1] ?? '').split(',').filter(Boolean) : null;
  const meals = parseMeals(readFileSync(MEALS_TS, 'utf8')).filter((m) => !only || only.includes(m.id));

  if (argv.includes('--list')) {
    for (const m of meals) console.log(`${m.id}: ${queriesFor(m).join(' | ')}`);
    return;
  }
  if (typeof fetch !== 'function') throw new Error('Needs Node 18 or newer (node --version).');

  mkdirSync(PHOTO_DIR, { recursive: true });
  const pexelsKey = process.env.PEXELS_API_KEY?.trim();
  const pixabayKey = process.env.PIXABAY_API_KEY?.trim();
  const credits = readCredits();
  const found = [];
  const missing = [];
  let skipped = 0;

  for (const [i, meal] of meals.entries()) {
    const file = join(PHOTO_DIR, `${meal.id}.jpg`);
    if (!force && existsSync(file)) {
      skipped++;
      continue;
    }
    process.stdout.write(`[${i + 1}/${meals.length}] ${meal.id} … `);
    let got = null;
    try {
      // Keyed stock sites only when a key is set: Openverse's food matches were too unreliable to ship.
      const sources = [
        ...(pixabayKey ? [(q) => searchPixabay(q, pixabayKey)] : []),
        ...(pexelsKey ? [(q) => searchPexels(q, pexelsKey)] : []),
        ...(pixabayKey || pexelsKey ? [] : [searchOpenverse]),
      ];
      for (const search of sources) {
        for (const q of queriesFor(meal)) {
          got = await tryCandidates(await search(q), file);
          if (got) break;
        }
        if (got) break;
      }
    } catch (e) {
      console.log(`error: ${e.message}`);
      if (/rate limited/i.test(e.message)) break;
      missing.push(meal.id);
      continue;
    }
    if (got) {
      credits[meal.id] = { mealId: meal.id, title: got.title, creator: got.creator, license: got.license, source: got.source, via: got.via };
      found.push(meal.id);
      console.log(`ok (${got.via})`);
    } else {
      missing.push(meal.id);
      console.log('nothing found');
    }
    writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + '\n');
  }

  for (const id of Object.keys(credits)) if (!existsSync(join(PHOTO_DIR, `${id}.jpg`))) delete credits[id];
  writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + '\n');
  const total = writeModule();
  console.log(`\nDone. New: ${found.length}, already had: ${skipped}, missing: ${missing.length}. The app now has ${total} of ${parseMeals(readFileSync(MEALS_TS, 'utf8')).length} photos.`);
  if (missing.length) {
    console.log(`Missing: ${missing.join(', ')}`);
    if (!pixabayKey && !pexelsKey) console.log('Tip: set PIXABAY_API_KEY (free at pixabay.com/api/docs) and run again.');
  }
  console.log('Check the photos in assets/meals before shipping; delete any you don’t like and run again.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
}
