const requireDotenv = require('dotenv');
requireDotenv.config();
const { createClient } = require('@supabase/supabase-js');

const OPENWA_API_URL = process.env.OPENWA_API_URL;
const OPENWA_API_KEY = process.env.OPENWA_API_KEY;

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'; 
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': OPENWA_API_KEY
};

async function getOrCreateSessionForUser(userId) {
    if (!userId) return null;

    try {
        const { data: user, error } = await supabase
            .from('internal_users')
            .select('whatsapp_session_id')
            .eq('id', userId)
            .single();

        if (error) {
            console.error(`Error fetching user ${userId}:`, error.message);
            return null;
        }

        let sessionId = user?.whatsapp_session_id;

        if (sessionId) {
            const res = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}`, { headers });
            if (res.ok) {
                return sessionId;
            } else {
                console.log(`Session ${sessionId} not valid on gateway, creating new one...`);
                sessionId = null;
            }
        }

        if (!sessionId) {
            const newSessionName = `unicrew-${userId}`;
            const createRes = await fetch(`${OPENWA_API_URL}/api/sessions`, { 
                method: 'POST', 
                headers, 
                body: JSON.stringify({ name: newSessionName }) 
            });
            const newSession = await createRes.json();
            
            if (newSession.id) {
                sessionId = newSession.id;
                await supabase
                    .from('internal_users')
                    .update({ whatsapp_session_id: sessionId })
                    .eq('id', userId);
                return sessionId;
            }
        }
    } catch (err) {
        console.error("Error getting session ID:", err);
    }
    return null;
}

async function getSessionStatus(userId) {
    if (!OPENWA_API_URL) return { status: 'DISCONNECTED', qr: null };
    try {
        const sessionId = await getOrCreateSessionForUser(userId);
        if (!sessionId) throw new Error("Could not get session ID");

        const stateRes = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}`, { headers });
        const stateData = await stateRes.json();
        
        const connectionState = stateData.status; 
        console.log(`OpenWA Session Status for ${sessionId}: ${connectionState}`);

        if (['connected', 'authenticated', 'ready', 'working', 'in-use'].includes(connectionState)) {
            return { status: 'CONNECTED', qr: null, sessionId };
        } else if (connectionState === 'qr_ready') {
            const qrRes = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/qr`, { headers });
            const qrData = await qrRes.json();
            return { status: 'QR_READY', qr: qrData.qrCode || qrData.qr, sessionId };
        } else if (['initializing', 'starting', 'authenticating'].includes(connectionState)) {
            return { status: 'STARTING', qr: null, sessionId };
        } else {
            console.log(`Triggering session start for unknown/disconnected state: ${connectionState}`);
            await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/start`, { method: 'POST', headers });
            return { status: 'STARTING', qr: null, sessionId };
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
async function fetchAllChats(userId) {
    try {
        const sessionId = await getOrCreateSessionForUser(userId);
        if (!sessionId) throw new Error("No session ID found for user");
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
async function getChatMessages(userId, chatId, limit = 5) {
    try {
        const sessionId = await getOrCreateSessionForUser(userId);
        if (!sessionId) throw new Error("No session ID found for user");
        const res = await fetch(`${OPENWA_API_URL}/api/sessions/${sessionId}/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
            return data;
        } else if (data && data.data && Array.isArray(data.data)) {
            return data.data;
        } else if (data && data.messages && Array.isArray(data.messages)) {
            return data.messages;
        }
        return [];
    } catch (err) {
        console.error(`Failed to fetch messages for ${chatId}:`, err.message);
        return [];
    }
}

module.exports = { startSession, getSessionStatus, fetchAllChats, getChatMessages };
