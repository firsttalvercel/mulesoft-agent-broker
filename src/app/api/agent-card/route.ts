import { NextRequest, NextResponse } from 'next/server';
import { AgentCard } from '@/lib/types';

// In-memory cache — keyed by brokerUrl, cleared on cold start
const cache = new Map<string, AgentCard>();

function isAgentCard(data: unknown): data is AgentCard {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  // Must not be a JSON-RPC envelope
  if ('jsonrpc' in obj) return false;
  // Must have at least one meaningful field
  return 'name' in obj || 'skills' in obj || 'description' in obj;
}

function buildCandidates(brokerUrl: string): string[] {
  const base = brokerUrl.replace(/\/$/, '');
  let origin = base;
  try {
    origin = new URL(brokerUrl).origin;
  } catch { /* use base */ }

  const paths = [
    // Path-relative well-known (A2A spec variants)
    `${base}/.well-known/agent.json`,
    `${base}/.well-known/agent`,
    `${base}/.well-known/agents`,
    `${base}/.well-known/agents.json`,
    // Origin-level well-known (more common for hosted brokers)
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

  // Deduplicate while preserving order
  return [...new Set(paths)];
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

  const candidates = buildCandidates(brokerUrl);

  for (const endpoint of candidates) {
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;

      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json') && !ct.includes('text/')) continue;

      const text = await res.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { continue; }

      if (isAgentCard(parsed)) {
        const card = parsed as AgentCard;
        cache.set(brokerUrl, card);
        return NextResponse.json(card);
      }
    } catch {
      // Timeout or network error — try next candidate
    }
  }

  return NextResponse.json(
    { error: 'Agent card not discoverable from this endpoint', tried: candidates.length },
    { status: 404 },
  );
}
