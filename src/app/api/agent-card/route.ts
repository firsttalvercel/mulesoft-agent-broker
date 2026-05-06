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

export async function GET(req: NextRequest) {
  const brokerUrl = req.nextUrl.searchParams.get('url');
  if (!brokerUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  if (cache.has(brokerUrl)) {
    return NextResponse.json(cache.get(brokerUrl));
  }

  const base = brokerUrl.replace(/\/$/, '');
  const candidates = [
    `${base}/.well-known/agent.json`,
    base,
    `${base}/agent-card`,
    `${base}/info`,
  ];

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
        cache.set(brokerUrl, parsed as AgentCard);
        return NextResponse.json(parsed);
      }
    } catch {
      // Timeout or network error — try next candidate
    }
  }

  return NextResponse.json({ error: 'Agent card not discoverable from this endpoint' }, { status: 404 });
}
