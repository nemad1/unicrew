import { NextResponse } from 'next/server';

// Proxy the sync request to the local Express backend which has the Supabase Service Role Key
// and handles the upsert logic.
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/whatsapp/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: "Backend sync failed" }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Next.js sync proxy error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
