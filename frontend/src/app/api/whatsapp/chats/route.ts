import { NextResponse } from 'next/server';

const OPENWA_API_URL = process.env.NEXT_PUBLIC_OPENWA_API_URL || "https://openwa-production-7315.up.railway.app";
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || process.env.NEXT_PUBLIC_OPENWA_API_KEY || "";

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': OPENWA_API_KEY
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/chats`, { headers });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch chats from OpenWA' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Chats fetch error:", err);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
