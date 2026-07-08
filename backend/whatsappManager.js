const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const activeSessions = new Map();

async function startSession(userId) {
    if (activeSessions.has(userId)) {
        return activeSessions.get(userId);
    }

    const authStorePath = path.join(__dirname, 'auth_store', userId);
    
    // Ensure auth_store directory exists
    if (!fs.existsSync(authStorePath)) {
        fs.mkdirSync(authStorePath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authStorePath);
    
    // STRICT MEMORY OPTIMIZATIONS for Railway 156MB limits
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }), // Reduce memory/logs
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false, // NEVER sync history
        getMessage: async () => ({ conversation: '' }) // Bypass cache
    });

    const sessionData = { sock, status: 'DISCONNECTED', qrBase64: null };
    activeSessions.set(userId, sessionData);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;

        if (qr) {
            try {
                sessionData.qrBase64 = await qrcode.toDataURL(qr);
                sessionData.status = 'QR_READY';
                console.log(`[${userId}] QR code generated`);
            } catch (err) {
                console.error(`[${userId}] Failed to generate QR Base64`, err);
            }
        }
        
        if (connection === 'open') {
            sessionData.status = 'CONNECTED';
            sessionData.qrBase64 = null;
            console.log(`[${userId}] WhatsApp connection OPEN`);
        }

        if (connection === 'close') {
            sessionData.status = 'DISCONNECTED';
            console.log(`[${userId}] WhatsApp connection CLOSED`);
            activeSessions.delete(userId);
            // Optional: Reconnect logic could be added here
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Placeholder for incoming messages
    sock.ev.on('messages.upsert', (m) => {
        // Here we could trigger a call to our Supabase database or internal webhook
        // We'll wire this up closely when we integrate Supabase fully.
        console.log(`[${userId}] Received messages upsert from Baileys`);
    });

    return sessionData;
}

function getSessionStatus(userId) {
    const session = activeSessions.get(userId);
    if (!session) {
        return { status: 'DISCONNECTED' };
    }
    return {
        status: session.status,
        qr: session.qrBase64
    };
}

module.exports = { startSession, getSessionStatus };
