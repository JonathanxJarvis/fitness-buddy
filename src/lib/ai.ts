import Anthropic from '@anthropic-ai/sdk';
import type { BetaContentBlockParam, BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { getApiKey } from './secrets';
import type { AppState, ChatMessage, Food, MealComponent, Nutrients } from './types';
import { addDays, todayKey } from './dates';
import { itemNutrients, servingText } from './nutrition';
import { formatWeight } from './units';

/**
 * Claude powers the Coach chat and meal-photo estimates. By default requests go
 * through the app's own AI server (server/ai-proxy), which holds the API key,
 * so users need no key. Someone who adds a personal key in Profile calls the
 * Claude API directly with it instead. Server-side fallbacks are on, so if the
 * primary model is overloaded Anthropic retries on a fallback model.
 */
const MODEL = 'claude-opus-5';
const BETAS = ['server-side-fallback-2026-07-01'];

const PROXY_URL = process.env.EXPO_PUBLIC_AI_PROXY_URL?.replace(/\/+$/, '') || null;
const APP_TOKEN = process.env.EXPO_PUBLIC_AI_APP_TOKEN || null;

export const hasBuiltInAi = PROXY_URL !== null;

export class MissingKeyError extends Error {
  constructor() {
    super('AI isn’t set up in this build yet. Add a Claude API key in Profile → AI Coach.');
  }
}

/** Which way AI requests will go: a personal key, the app's server, or neither. */
export async function aiMode(): Promise<'personal' | 'builtin' | null> {
  if (await getApiKey()) return 'personal';
  return PROXY_URL ? 'builtin' : null;
}

async function client(): Promise<Anthropic> {
  const apiKey = await getApiKey();
  // A personal key belongs to the person using the app and stays on their device.
  if (apiKey) return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
  if (!PROXY_URL) throw new MissingKeyError();
  // The app's server adds the real key; the SDK still needs a placeholder.
  return new Anthropic({
    apiKey: 'proxy',
    baseURL: PROXY_URL,
    defaultHeaders: APP_TOKEN ? { 'x-app-token': APP_TOKEN } : undefined,
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });
}

export function friendlyError(e: unknown): string {
  if (e instanceof MissingKeyError) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return 'The AI service rejected this request. If you added your own key in Profile, check it there.';
  if (e instanceof Anthropic.RateLimitError) return 'Too many AI requests right now. Try again in a minute.';
  if (e instanceof Anthropic.APIConnectionError) return 'Couldn’t reach Claude. Check your internet connection.';
  if (e instanceof Anthropic.APIError) return `Claude returned an error (${e.status ?? 'unknown'}). Try again.`;
  return e instanceof Error ? e.message : 'Something went wrong.';
}

function imageBlock(base64: string): BetaContentBlockParam {
  return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } };
}

// ---------------------------------------------------------------- meal photos

export interface MealEstimate {
  isFood: boolean;
  name: string;
  items: MealComponent[];
  totals: Nutrients;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
}

const num = { type: 'number' } as const;

const MEAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_food', 'meal_name', 'items', 'fiber_g', 'sugar_g', 'sodium_mg', 'confidence', 'notes'],
  properties: {
    is_food: { type: 'boolean', description: 'False if the photo does not show food or drink.' },
    meal_name: { type: 'string', description: 'Short, appetizing name for the whole plate, e.g. "Steak with side salad".' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'grams', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
        properties: { name: { type: 'string' }, grams: num, calories: num, protein_g: num, carbs_g: num, fat_g: num },
      },
    },
    fiber_g: num,
    sugar_g: num,
    sodium_mg: num,
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    notes: { type: 'string', description: 'One or two sentences on assumptions (portion size, cooking oil, hidden ingredients).' },
  },
} as const;

interface RawEstimate {
  is_food: boolean;
  meal_name: string;
  items: { name: string; grams: number; calories: number; protein_g: number; carbs_g: number; fat_g: number }[];
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
}

export function parseEstimate(raw: RawEstimate): MealEstimate {
  const items: MealComponent[] = raw.items.map((i) => ({
    name: i.name,
    grams: Math.max(0, Math.round(i.grams)),
    calories: Math.max(0, Math.round(i.calories)),
    protein: Math.max(0, +i.protein_g.toFixed(1)),
    carbs: Math.max(0, +i.carbs_g.toFixed(1)),
    fat: Math.max(0, +i.fat_g.toFixed(1)),
  }));
  const totals = items.reduce<Nutrients>(
    (a, i) => ({ ...a, calories: a.calories + i.calories, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: Math.max(0, raw.fiber_g), sugar: Math.max(0, raw.sugar_g), sodium: Math.max(0, raw.sodium_mg) },
  );
  return { isFood: raw.is_food, name: raw.meal_name, items, totals, confidence: raw.confidence, notes: raw.notes };
}

/** Sends a meal photo (base64 JPEG) to Claude and returns its nutrition estimate. */
export async function estimateMeal(base64: string, hint?: string): Promise<MealEstimate> {
  const c = await client();
  const res = await c.beta.messages.create({
    model: MODEL,
    betas: BETAS,
    fallbacks: 'default',
    max_tokens: 2048,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: MEAL_SCHEMA as unknown as Record<string, unknown> } },
    system:
      'You are a registered dietitian estimating nutrition from meal photos for a food-logging app. ' +
      'Identify each distinct food on the plate, estimate its portion in grams from visual cues (plate size, utensils, hands), ' +
      'and give calories and macros for that portion using standard nutrition databases (USDA). ' +
      'Account for visible oil, sauces and dressings. Be realistic rather than conservative; people under-report. ' +
      'Round sensibly. If the image is not food, set is_food to false and return an empty items list.',
    messages: [
      {
        role: 'user',
        content: [imageBlock(base64), { type: 'text', text: hint ? `Estimate this meal. Extra context from me: ${hint}` : 'Estimate this meal.' }],
      },
    ],
  });
  if (res.stop_reason === 'refusal') throw new Error('Claude couldn’t analyze this photo. Try a different one.');
  const text = res.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('Claude didn’t return an estimate. Try again.');
  return parseEstimate(JSON.parse(text.text) as RawEstimate);
}

/** Turns an estimate into a Food whose base serving is the whole plate. */
export function estimateToFood(est: MealEstimate, id: string): Food {
  return {
    id: `ai:${id}`,
    name: est.name,
    source: 'ai',
    nutrients: est.totals,
    servings: [
      { label: 'plate (as pictured)', factor: 1 },
      { label: 'half plate', factor: 0.5 },
    ],
    components: est.items,
    note: est.notes,
  };
}

// ---------------------------------------------------------------- coach chat

function round(n: number | undefined) {
  return Math.round(n ?? 0);
}

/** A compact snapshot of the user's profile, goals and recent logs for the coach. */
export function coachContext(state: AppState): string {
  const p = state.profile;
  const g = state.goals;
  const units = state.settings.units;
  const today = todayKey();
  const lines: string[] = [];
  if (p) {
    lines.push(
      `Profile: ${p.name ? p.name + ', ' : ''}${p.sex}, ${p.age} y, ${Math.round(p.heightCm)} cm, ${formatWeight(p.weightKg, units)}, activity ${p.activity}, goal ${p.goal}${p.goal !== 'maintain' ? ` (${p.weeklyRateKg} kg/week)` : ''}.`,
    );
  }
  if (g) {
    lines.push(
      `Daily goals: ${g.calories} kcal, protein ${g.protein} g (1 g per lb of body weight), carbs ${g.carbs} g, fat ${g.fat} g, fiber ${g.fiber} g, sugar ≤ ${g.sugar} g, sodium ≤ ${g.sodium} mg, ${g.steps} steps.`,
    );
  }
  const todays = state.entries.filter((e) => e.date === today);
  if (todays.length) {
    lines.push(`Logged today (${today}):`);
    for (const e of todays) {
      const n = itemNutrients(e);
      lines.push(`- ${e.meal}: ${e.food.name} (${servingText(e)}): ${round(n.calories)} kcal, P ${round(n.protein)} g, C ${round(n.carbs)} g, F ${round(n.fat)} g`);
    }
  } else {
    lines.push(`Nothing logged yet today (${today}).`);
  }
  const burned = state.exercises.filter((x) => x.date === today).reduce((s, x) => s + x.calories, 0);
  if (burned) lines.push(`Exercise today: ${burned} kcal burned.`);
  if (state.steps[today]) lines.push(`Steps today: ${state.steps[today]}.`);
  if (state.water[today]) lines.push(`Water today: ${state.water[today]} ml.`);

  const week: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, -i);
    const es = state.entries.filter((e) => e.date === d);
    if (!es.length) continue;
    const t = es.reduce((a, e) => {
      const n = itemNutrients(e);
      return { c: a.c + n.calories, p: a.p + n.protein };
    }, { c: 0, p: 0 });
    week.push(`${d}: ${round(t.c)} kcal, ${round(t.p)} g protein`);
  }
  if (week.length) lines.push(`Previous 7 days: ${week.join('; ')}.`);
  const weights = Object.entries(state.weights).sort(([a], [b]) => a.localeCompare(b)).slice(-5);
  if (weights.length > 1) lines.push(`Recent weigh-ins: ${weights.map(([d, kg]) => `${d} ${formatWeight(kg, units)}`).join(', ')}.`);
  return lines.join('\n');
}

const COACH_SYSTEM = (context: string) =>
  `You are Coach, the friendly nutrition and fitness coach inside the Fitness Buddy app. ` +
  `You know the user's goals and today's log (below). Give specific, practical answers grounded in their numbers: ` +
  `what to eat next to hit protein, how a meal fits their day, swaps, simple recipes, training and recovery basics. ` +
  `When they send a meal photo, estimate calories and macros for it and say how it fits their remaining budget. ` +
  `Keep replies short and conversational for a phone screen: a few sentences or a short list, no tables, no markdown headings. ` +
  `Use the user's units (${context.includes(' lb') ? 'US: lb, oz' : 'metric: kg, g'}). ` +
  `You are not a doctor; for medical conditions, eating disorders or medication questions, suggest they talk to a professional.\n\n` +
  `<user_data>\n${context}\n</user_data>`;

/**
 * Sends the conversation to Claude and returns the coach's reply. `photoBase64`
 * attaches an image to the latest user message.
 */
export async function askCoach(state: AppState, history: ChatMessage[], photoBase64?: string): Promise<string> {
  const c = await client();
  const recent = history.filter((m) => !m.error).slice(-20);
  // The API needs the conversation to start with a user turn.
  while (recent.length && recent[0].role !== 'user') recent.shift();
  const messages: BetaMessageParam[] = recent.map((m, i) => {
    const last = i === recent.length - 1;
    if (last && m.role === 'user' && photoBase64) {
      return { role: 'user', content: [imageBlock(photoBase64), { type: 'text', text: m.text || 'What do you think of this meal?' }] };
    }
    return { role: m.role, content: m.photo && !last ? `[sent a meal photo] ${m.text}` : m.text };
  });
  const res = await c.beta.messages.create({
    model: MODEL,
    betas: BETAS,
    fallbacks: 'default',
    max_tokens: 1500,
    output_config: { effort: 'low' },
    system: COACH_SYSTEM(coachContext(state)),
    messages,
  });
  if (res.stop_reason === 'refusal') return 'I can’t help with that one. Ask me anything about your food, goals or training.';
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();
  return text || 'Sorry, I didn’t catch that. Could you ask again?';
}
