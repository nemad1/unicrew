import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ status: 'STARTING', qr: null, error: 'userId is required' });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/whatsapp/status?userId=${userId}`);
    if (!res.ok) {
      return NextResponse.json({ status: 'STARTING', qr: null });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Status check proxy error:", err);
    return NextResponse.json({ status: 'STARTING', qr: null });
  }
}
