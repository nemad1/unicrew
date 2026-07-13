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
    const { sessionId, chatId, fileBase64, fileName, caption } = body;

    if (!sessionId || !chatId || !fileBase64) {
      return NextResponse.json({ error: 'sessionId, chatId, and fileBase64 are required' }, { status: 400 });
    }

    // Parse the Data URL (e.g. data:image/png;base64,iVBORw...)
    const matches = fileBase64.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: 'Invalid base64 file format' }, { status: 400 });
    }
    
    const mimetype = matches[1];
    const rawBase64 = matches[2];

    let endpointPath = 'send-document';
    if (mimetype.startsWith('image/')) endpointPath = 'send-image';
    else if (mimetype.startsWith('video/')) endpointPath = 'send-video';
    else if (mimetype.startsWith('audio/')) endpointPath = 'send-audio';

    const res = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/messages/${endpointPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        chatId, 
        base64: rawBase64, 
        filename: fileName || 'file', 
        caption: caption || '',
        mimetype: mimetype
      })
    });

    if (!res.ok) {
      const errResponse = await res.json().catch(() => null);
      console.error("OpenWA Send Media failed:", res.status, errResponse);
      return NextResponse.json({ error: 'Failed to send media via OpenWA' }, { status: res.status });
    }

    const data = await res.json().catch(() => ({ success: true }));
    return NextResponse.json(data);
  } catch (err) {
    console.error("Media send error:", err);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
