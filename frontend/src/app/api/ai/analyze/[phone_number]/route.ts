import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ phone_number: string }> }
) {
  const { phone_number } = await params;

  try {
    const res = await fetch(`${BACKEND_URL}/api/ai/analyze/${phone_number}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: "Backend analysis failed" }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Next.js analyze proxy error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
