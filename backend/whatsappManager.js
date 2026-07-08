const requireDotenv = require('dotenv');
requireDotenv.config();

const OPENWA_API_URL = process.env.OPENWA_API_URL;
const OPENWA_API_KEY = process.env.OPENWA_API_KEY;

const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': OPENWA_API_KEY
};

let activeSessionId = null;

async function getOrCreateSessionId() {
    if (activeSessionId) return activeSessionId;
    
    try {
        const res = await fetch(`${OPENWA_API_URL}/api/sessions`, { headers });
        const sessions = await res.json();
        if (Array.isArray(sessions) && sessions.length > 0) {
            activeSessionId = sessions[0].id;
            return activeSessionId;
        }

        const createRes = await fetch(`${OPENWA_API_URL}/api/sessions`, { 
            method: 'POST', 
            headers, 
            body: JSON.stringify({ name: 'unicrew-main' }) 
        });
        const newSession = await createRes.json();
        if (newSession.id) {
            activeSessionId = newSession.id;
            return activeSessionId;
        }
    } catch (err) {
        console.error("Error getting session ID:", err);
    }
    return null;
}

async function getSessionStatus(userId) {
    if (!OPENWA_API_URL) return { status: 'DISCONNECTED', qr: null };
    try {
        const sessionId = await getOrCreateSessionId();
        if (!sessionId) throw new Error("Could not get session ID");

        const stateRes = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}`, { headers });
        const stateData = await stateRes.json();
        
        const connectionState = stateData.status; 
        console.log(`OpenWA Session Status for ${sessionId}: ${connectionState}`);

        if (['connected', 'authenticated', 'ready', 'working', 'in-use'].includes(connectionState)) {
            return { status: 'CONNECTED', qr: null };
        } else if (connectionState === 'qr_ready') {
            const qrRes = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/qr`, { headers });
            const qrData = await qrRes.json();
            return { status: 'QR_READY', qr: qrData.qrCode || qrData.qr };
        } else if (connectionState === 'initializing' || connectionState === 'starting' || connectionState === 'authenticating') {
            return { status: 'STARTING', qr: null };
        } else {
            console.log(`Triggering session start for unknown/disconnected state: ${connectionState}`);
            await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/start`, { method: 'POST', headers });
            return { status: 'STARTING', qr: null };
        }
    } catch (err) {
        console.error("OpenWA Status Fetch Error:", err.message);
        return { status: 'STARTING', qr: null };
    }
}

async function startSession(userId) {
    return getSessionStatus(userId);
}

// Fetch all chats
async function fetchAllChats() {
    try {
        const sessionId = await getOrCreateSessionId();
        const res = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/chats`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (data.data && Array.isArray(data.data)) return data.data;
        return [];
    } catch (err) {
        console.error("Failed to fetch chats:", err.message);
        return [];
    }
}

// Fetch recent messages for a chat
async function getChatMessages(chatId, limit = 5) {
    try {
        const sessionId = await getOrCreateSessionId();
        // The correct OpenWA API endpoint is /api/sessions/:id/messages?chatId=:chatId
        const res = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
            return data;
        } else if (data.data && Array.isArray(data.data)) {
            return data.data;
        }
        return [];
    } catch (err) {
        console.error(`Failed to fetch messages for ${chatId}:`, err.message);
        return [];
    }
}

module.exports = { startSession, getSessionStatus, fetchAllChats, getChatMessages };
