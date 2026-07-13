import { NextResponse } from 'next/server';

const OPENWA_API_URL = process.env.NEXT_PUBLIC_OPENWA_API_URL || "https://openwa-production-7315.up.railway.app";
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || process.env.NEXT_PUBLIC_OPENWA_API_KEY || "";

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': OPENWA_API_KEY
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, chatId, text } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const res = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/messages/send-text`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ chatId, text })
    });

    if (!res.ok) {
      const errResponse = await res.json().catch(() => null);
      console.error("OpenWA Send Text failed:", res.status, errResponse);
      return NextResponse.json({ error: 'Failed to send message via OpenWA' }, { status: res.status });
    }

    const data = await res.json().catch(() => ({ success: true }));
    return NextResponse.json(data);
  } catch (err) {
    console.error("Message send error:", err);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
