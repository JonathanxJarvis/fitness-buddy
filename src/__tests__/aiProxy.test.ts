import { describe, expect, it } from '@jest/globals';
import worker, { MAX_TOKENS, rateLimited, validate } from '../../server/ai-proxy/worker';

const ok = { model: 'claude-opus-5', max_tokens: 1500, messages: [{ role: 'user', content: 'hi' }] };

describe('AI proxy', () => {
  it('accepts the requests the app makes', () => {
    expect(validate(ok)).toBeNull();
  });

  it('rejects other models, big outputs, tools and streaming', () => {
    expect(validate({ ...ok, model: 'claude-fable-5-1' })).toMatch(/Model/);
    expect(validate({ ...ok, max_tokens: MAX_TOKENS + 1 })).toMatch(/max_tokens/);
    expect(validate({ ...ok, tools: [] })).toMatch(/Tools/);
    expect(validate({ ...ok, stream: true })).toMatch(/Streaming/);
    expect(validate({ ...ok, messages: [] })).toMatch(/messages/);
  });

  it('limits requests per IP per hour', () => {
    const now = 1_000_000;
    for (let i = 0; i < 60; i++) expect(rateLimited('1.2.3.4', now + i)).toBe(false);
    expect(rateLimited('1.2.3.4', now + 100)).toBe(true);
    expect(rateLimited('5.6.7.8', now + 100)).toBe(false);
    expect(rateLimited('1.2.3.4', now + 60 * 60 * 1000 + 100)).toBe(false);
  });

  it('checks the app token and swaps in the real key', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    try {
      const env = { ANTHROPIC_API_KEY: 'sk-real', APP_TOKEN: 'secret' };
      const req = (token: string) =>
        new Request('https://proxy.example/v1/messages?beta=true', {
          method: 'POST',
          headers: { 'x-app-token': token, 'x-api-key': 'proxy', 'anthropic-beta': 'server-side-fallback-2026-07-01', 'cf-connecting-ip': '9.9.9.9' },
          body: JSON.stringify(ok),
        });
      expect((await worker.fetch(req('wrong'), env)).status).toBe(401);
      const res = await worker.fetch(req('secret'), env);
      expect(res.status).toBe(200);
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe('https://api.anthropic.com/v1/messages?beta=true');
      const h = calls[0].init.headers as Record<string, string>;
      expect(h['x-api-key']).toBe('sk-real');
      expect(h['anthropic-beta']).toBe('server-side-fallback-2026-07-01');
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
