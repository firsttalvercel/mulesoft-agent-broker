import { NextRequest, NextResponse } from 'next/server';

function extractTextFromA2AResponse(data: unknown): string {
  if (typeof data === 'string') return data;

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;

    const result = obj.result as Record<string, unknown> | undefined;
    if (result) {
      // A2A artifact format: result.artifacts[].parts[].text  (real broker format)
      const artifacts = result.artifacts as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(artifacts) && artifacts.length > 0) {
        const texts: string[] = [];
        for (const artifact of artifacts) {
          const parts = artifact.parts as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(parts)) {
            for (const part of parts) {
              if (part.kind === 'text' && typeof part.text === 'string') {
                texts.push(part.text);
              }
            }
          }
        }
        if (texts.length > 0) return texts.join('\n');
      }

      // A2A message format: result.message.parts[].text
      const msg = result.message as Record<string, unknown> | undefined;
      if (msg) {
        const parts = msg.parts as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(parts)) {
          const texts = parts
            .filter((p) => p.kind === 'text' && typeof p.text === 'string')
            .map((p) => p.text as string);
          if (texts.length > 0) return texts.join('\n');
        }
        if (typeof msg.content === 'string') return msg.content;
      }

      // result as plain string field
      for (const key of ['response', 'answer', 'output', 'text', 'content', 'reply']) {
        if (typeof result[key] === 'string') return result[key] as string;
      }
    }

    // Flat response
    for (const key of ['response', 'answer', 'output', 'text', 'content', 'reply', 'message']) {
      if (typeof obj[key] === 'string') return obj[key] as string;
    }

    return 'The broker returned a response in an unrecognized format.';
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
