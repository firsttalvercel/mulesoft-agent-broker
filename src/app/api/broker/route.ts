import { NextRequest, NextResponse } from 'next/server';

function extractPartsText(parts: unknown): string | null {
  if (!Array.isArray(parts)) return null;
  const texts: string[] = [];
  for (const part of parts) {
    if (part && typeof part === 'object') {
      const p = part as Record<string, unknown>;
      if (typeof p.text === 'string') texts.push(p.text);
    }
  }
  return texts.length > 0 ? texts.join('\n') : null;
}

function extractTextFromA2AResponse(data: unknown): string {
  if (typeof data === 'string' && data.trim()) return data;

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const result = obj.result as Record<string, unknown> | undefined;

    if (result) {
      // 1. result.artifacts[].parts[].text  (A2A Task format)
      const artifacts = result.artifacts as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(artifacts) && artifacts.length > 0) {
        const texts: string[] = [];
        for (const artifact of artifacts) {
          const t = extractPartsText(artifact.parts);
          if (t) texts.push(t);
        }
        if (texts.length > 0) return texts.join('\n');
      }

      // 2. result.parts[].text  (A2A Message format — newer spec)
      const directParts = extractPartsText(result.parts);
      if (directParts) return directParts;

      // 3. result.message.parts[].text
      const msg = result.message as Record<string, unknown> | undefined;
      if (msg) {
        const t = extractPartsText(msg.parts);
        if (t) return t;
        if (typeof msg.content === 'string') return msg.content;
      }

      // 4. result.status.message.parts[].text  (some brokers nest deeper)
      const status = result.status as Record<string, unknown> | undefined;
      if (status) {
        const statusMsg = status.message as Record<string, unknown> | undefined;
        if (statusMsg) {
          const t = extractPartsText(statusMsg.parts);
          if (t) return t;
        }
      }

      // 5. Plain string fields on result
      for (const key of ['response', 'answer', 'output', 'text', 'content', 'reply']) {
        if (typeof result[key] === 'string') return result[key] as string;
      }
    }

    // 6. Flat response (no result wrapper)
    for (const key of ['response', 'answer', 'output', 'text', 'content', 'reply', 'message']) {
      if (typeof obj[key] === 'string') return obj[key] as string;
    }

    // 7. JSON-RPC / structured error response
    if (obj.error && typeof obj.error === 'object') {
      const err = obj.error as Record<string, unknown>;
      const errData = typeof err.data === 'string' ? err.data : '';
      const errMsg = typeof err.message === 'string' ? err.message : '';
      if (errData.toLowerCase().includes('pii') || errMsg.toLowerCase().includes('pii')) {
        return PII_ERROR_MESSAGE;
      }
      return errMsg || 'The broker returned an error.';
    }

    // 8. Last resort: raw JSON (for debugging, stripped to essentials)
    return `Broker returned an unrecognized format. Raw: ${JSON.stringify(data).slice(0, 300)}`;
  }

  return String(data);
}

const PII_ERROR_MESSAGE = 'The request contains information that is not allowed. Please remove sensitive details and try again.';

function sanitizePiiError(data: unknown): { sanitized: unknown; isPiiBlocked: boolean } {
  if (typeof data !== 'object' || data === null) return { sanitized: data, isPiiBlocked: false };
  const obj = data as Record<string, unknown>;
  if (!obj.error) return { sanitized: data, isPiiBlocked: false };

  const error = obj.error as Record<string, unknown>;
  const dataField = typeof error.data === 'string' ? error.data : '';
  const isPiiError =
    dataField.toLowerCase().includes('pii') ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes('pii'));

  if (!isPiiError) return { sanitized: data, isPiiBlocked: false };

  return {
    sanitized: {
      ...obj,
      error: {
        code: error.code,
        message: PII_ERROR_MESSAGE,
      },
    },
    isPiiBlocked: true,
  };
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

    const { sanitized, isPiiBlocked: piiFromSanitize } = sanitizePiiError(parsed);
    const responseText = piiFromSanitize
      ? PII_ERROR_MESSAGE
      : extractTextFromA2AResponse(sanitized);
    const isPiiBlocked = piiFromSanitize || responseText === PII_ERROR_MESSAGE;

    return NextResponse.json({ response: responseText, raw: sanitized, isPiiBlocked });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
