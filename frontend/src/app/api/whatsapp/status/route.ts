import { NextResponse } from 'next/server';

const OPENWA_API_URL = process.env.NEXT_PUBLIC_OPENWA_API_URL || "https://openwa-production-7315.up.railway.app";
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || "";

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': OPENWA_API_KEY
};

async function getOrCreateSessionId() {
  try {
    const res = await fetch(`${OPENWA_API_URL}/api/sessions`, { headers });
    const sessions = await res.json();
    if (Array.isArray(sessions) && sessions.length > 0) {
      return sessions[0].id;
    }
    const createRes = await fetch(`${OPENWA_API_URL}/api/sessions`, { 
      method: 'POST', 
      headers, 
      body: JSON.stringify({ name: 'unicrew-main' }) 
    });
    const newSession = await createRes.json();
    if (newSession.id) {
      return newSession.id;
    }
  } catch (err) {
    console.error("Error getting session ID:", err);
  }
  return null;
}

export async function GET(request: Request) {
  const sessionId = await getOrCreateSessionId();
  if (!sessionId) {
    return NextResponse.json({ status: 'STARTING', qr: null });
  }

  try {
    const stateRes = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}`, { headers });
    const stateData = await stateRes.json();
    const connectionState = stateData.status;

    if (['connected', 'authenticated', 'ready', 'working', 'in-use'].includes(connectionState)) {
      return NextResponse.json({ status: 'CONNECTED', qr: null, sessionId });
    } else if (connectionState === 'qr_ready') {
      const qrRes = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/qr`, { headers });
      const qrData = await qrRes.json();
      return NextResponse.json({ status: 'QR_READY', qr: qrData.qrCode || qrData.qr, sessionId });
    } else if (['initializing', 'starting', 'authenticating'].includes(connectionState)) {
      return NextResponse.json({ status: 'STARTING', qr: null, sessionId });
    } else {
      await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/start`, { method: 'POST', headers });
      return NextResponse.json({ status: 'STARTING', qr: null, sessionId });
    }
  } catch (err) {
    console.error("Status check error:", err);
    return NextResponse.json({ status: 'STARTING', qr: null, sessionId });
  }
}
