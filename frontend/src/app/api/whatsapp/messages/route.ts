import { NextResponse } from 'next/server';

const OPENWA_API_URL = process.env.NEXT_PUBLIC_OPENWA_API_URL || "https://openwa-production-7315.up.railway.app";
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || "";

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': OPENWA_API_KEY
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const chatId = searchParams.get('chatId');
  const limit = searchParams.get('limit') || '100';

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  if (!chatId) {
    return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`, { headers });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch messages from OpenWA' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Messages fetch error:", err);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
