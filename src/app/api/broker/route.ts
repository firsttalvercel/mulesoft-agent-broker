import { NextRequest, NextResponse } from 'next/server';

function extractTextFromA2AResponse(data: unknown): string {
  if (typeof data === 'string') return data;

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;

    // A2A / JSON-RPC 2.0 format: result.message.parts[].text
    const result = obj.result as Record<string, unknown> | undefined;
    if (result) {
      const msg = result.message as Record<string, unknown> | undefined;
      if (msg) {
        const parts = msg.parts as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(parts)) {
          const texts = parts
            .filter((p) => p.kind === 'text' && typeof p.text === 'string')
            .map((p) => p.text as string);
          if (texts.length > 0) return texts.join('\n');
        }
        // result.message.content (alternative)
        if (typeof msg.content === 'string') return msg.content;
      }

      // result.parts[] directly
      const resultParts = result.parts as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(resultParts)) {
        const texts = resultParts
          .filter((p) => p.kind === 'text' && typeof p.text === 'string')
          .map((p) => p.text as string);
        if (texts.length > 0) return texts.join('\n');
      }

      // result as a plain string field
      for (const key of ['response', 'answer', 'output', 'text', 'content', 'reply']) {
        if (typeof result[key] === 'string') return result[key] as string;
      }
    }

    // Flat response: common field names
    for (const key of ['response', 'answer', 'output', 'text', 'content', 'reply', 'message']) {
      if (typeof obj[key] === 'string') return obj[key] as string;
    }

    return JSON.stringify(data, null, 2);
  }

  return String(data);
}

export async function POST(req: NextRequest) {
  try {
    const { message, brokerUrl } = await req.json();

    if (!brokerUrl || !message) {
      return NextResponse.json({ error: 'Missing message or brokerUrl' }, { status: 400 });
    }

    const requestId = crypto.randomUUID();
    const messageId = crypto.randomUUID();

    const body = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'message/send',
      params: {
        message: {
          role: 'user',
          kind: 'message',
          parts: [{ kind: 'text', text: message }],
          messageId,
        },
      },
    };

    const upstream = await fetch(brokerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const raw = await upstream.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }

    const responseText = extractTextFromA2AResponse(parsed);

    return NextResponse.json({ response: responseText, raw: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
