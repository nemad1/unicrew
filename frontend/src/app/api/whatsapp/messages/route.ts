import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const chatId = searchParams.get('chatId');
  const limit = searchParams.get('limit') || '100';

  if (!sessionId || !chatId) {
    return NextResponse.json({ error: 'sessionId and chatId are required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/whatsapp/messages?sessionId=${sessionId}&chatId=${encodeURIComponent(chatId)}&limit=${limit}`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch messages from backend' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Messages proxy error:", err);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
