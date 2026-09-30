import Anthropic from '@anthropic-ai/sdk';
import { aiMode } from '@/lib/ai';
import { getApiKey } from '@/lib/secrets';
import { MEALS, findMeal } from '@/lib/meals';
import { favoriteMealIds, fitsDiet, type MealDiet } from '@/lib/mealPlan';

// Same model and routing as lib/ai (personal key, else the app's proxy), which only allows this model.
const MODEL = 'claude-opus-5';
const PROXY_URL = process.env.EXPO_PUBLIC_AI_PROXY_URL?.replace(/\/+$/, '') || null;
const APP_TOKEN = process.env.EXPO_PUBLIC_AI_APP_TOKEN || null;
const TIMEOUT_MS = 12000;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['meal_ids'],
  properties: { meal_ids: { type: 'array', items: { type: 'string' } } },
} as const;

async function client(): Promise<Anthropic | null> {
  const apiKey = await getApiKey();
  if (apiKey) return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 0, timeout: TIMEOUT_MS });
  if (!PROXY_URL) return null;
  return new Anthropic({
    apiKey: 'proxy',
    baseURL: PROXY_URL,
    defaultHeaders: APP_TOKEN ? { 'x-app-token': APP_TOKEN } : undefined,
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
    timeout: TIMEOUT_MS,
  });
}

/** Library meal ids Claude thinks match the favorites. Empty when AI is off or anything fails. */
export async function aiFavoriteIds(favorites: string, diet: MealDiet): Promise<string[]> {
  try {
    if (!favorites.trim() || !(await aiMode())) return [];
    const c = await client();
    if (!c) return [];
    const library = MEALS.filter((m) => fitsDiet(m, diet))
      .map((m) => `${m.id}: ${m.name} / ${m.nameDe}`)
      .join('\n');
    const res = await c.beta.messages.create({
      model: MODEL,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      max_tokens: 600,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA as unknown as Record<string, unknown> } },
      system:
        'You match a person’s favorite foods to recipes in a meal-planning app. ' +
        'Return the ids of up to 15 recipes from the list that match or are very close to what they like. ' +
        'Their text may be German or English and may have typos. Only use ids from the list.',
      messages: [{ role: 'user', content: `<favorites>${favorites.slice(0, 300)}</favorites>\n\n<recipes>\n${library}\n</recipes>` }],
    });
    const text = res.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return [];
    const ids = (JSON.parse(text.text) as { meal_ids?: unknown }).meal_ids;
    return Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === 'string' && !!findMeal(id)))].slice(0, 15) : [];
  } catch {
    return [];
  }
}

/** Local matches first, then any extra AI picks. Never throws; works offline. */
export async function resolveFavoriteIds(favorites: string, diet: MealDiet): Promise<string[]> {
  const local = favoriteMealIds(favorites);
  const ai = await aiFavoriteIds(favorites, diet);
  return [...new Set([...local, ...ai])];
}
