import { NextRequest, NextResponse } from 'next/server';
import { AgentCard } from '@/lib/types';

// In-memory cache — keyed by brokerUrl, cleared on cold start
const cache = new Map<string, AgentCard>();

function isAgentCard(data: unknown): data is AgentCard {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const obj = data as Record<string, unknown>;
  return 'name' in obj || 'skills' in obj || 'description' in obj;
}

/**
 * Extract an agent card from any parsed JSON payload.
 * Handles:
 *  1. Direct agent card: { name, skills, ... }
 *  2. JSON-RPC envelope:  { jsonrpc, result: { name, skills, ... } }
 *  3. JSON-RPC envelope with skills at root: { jsonrpc, result: {...}, skills: [...] }
 */
function extractCard(parsed: unknown): AgentCard | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;

  // If it's a JSON-RPC envelope, prefer the result
  if ('jsonrpc' in obj) {
    const result = obj.result;
    if (isAgentCard(result)) return result as AgentCard;
    // Skills might be at the top level even in a JSON-RPC response
    if ('skills' in obj) return obj as AgentCard;
    return null;
  }

  // Plain agent card
  if (isAgentCard(obj)) return obj as AgentCard;
  return null;
}

function buildGetCandidates(brokerUrl: string): string[] {
  const base = brokerUrl.replace(/\/$/, '');
  let origin = base;
  try { origin = new URL(brokerUrl).origin; } catch { /* use base */ }

  const paths = [
    // MuleSoft / CloudHub variant (the correct path for this broker)
    `${base}/.well-known/agent-card.json`,
    `${base}/.well-known/agent-card`,
    `${origin}/.well-known/agent-card.json`,
    `${origin}/.well-known/agent-card`,
    // A2A spec standard
    `${base}/.well-known/agent.json`,
    `${base}/.well-known/agent`,
    `${base}/.well-known/agents`,
    `${base}/.well-known/agents.json`,
    `${origin}/.well-known/agent.json`,
    `${origin}/.well-known/agent`,
    `${origin}/.well-known/agents`,
    `${origin}/.well-known/agents.json`,
    // Direct endpoint probes
    base,
    `${base}/agent-card`,
    `${base}/info`,
    `${base}/metadata`,
  ];

  return [...new Set(paths)];
}

async function tryGet(endpoint: string): Promise<AgentCard | null> {
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json') && !ct.includes('text/')) return null;

    const text = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return null; }

    return extractCard(parsed);
  } catch {
    return null;
  }
}

/**
 * POST-based discovery fallback.
 * Tries the A2A agent/info method — MuleSoft brokers may respond with the agent card.
 * Also tries an empty POST body in case the broker returns its card that way.
 */
async function tryPost(brokerUrl: string): Promise<AgentCard | null> {
  const attempts = [
    // A2A agent/info method
    {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'agent/info',
        id: crypto.randomUUID(),
        params: {},
      }),
    },
    // A2A tasks/send with empty message (some brokers return capabilities)
    {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tasks/send',
        id: crypto.randomUUID(),
        params: {},
      }),
    },
  ];

  for (const attempt of attempts) {
    try {
      const res = await fetch(brokerUrl, {
        method: attempt.method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: attempt.body,
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const text = await res.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { continue; }

      const card = extractCard(parsed);
      if (card) return card;
    } catch {
      // Timeout or network error
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const brokerUrl = req.nextUrl.searchParams.get('url');
  if (!brokerUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  const bust = req.nextUrl.searchParams.get('refresh') === '1';
  if (!bust && cache.has(brokerUrl)) {
    return NextResponse.json(cache.get(brokerUrl));
  }

  // Phase 1 — try all GET candidates
  const candidates = buildGetCandidates(brokerUrl);
  for (const endpoint of candidates) {
    const card = await tryGet(endpoint);
    if (card) {
      cache.set(brokerUrl, card);
      return NextResponse.json(card);
    }
  }

  // Phase 2 — POST-based discovery fallback
  const card = await tryPost(brokerUrl);
  if (card) {
    cache.set(brokerUrl, card);
    return NextResponse.json(card);
  }

  return NextResponse.json(
    { error: 'Agent card not discoverable', tried: candidates.length + 2 },
    { status: 404 },
  );
}
