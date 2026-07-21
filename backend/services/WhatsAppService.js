class WhatsAppService {
    constructor({ apiUrl, apiKey, internalUserRepository }) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.internalUserRepository = internalUserRepository;
        this.headers = { 'Content-Type': 'application/json', 'X-API-Key': apiKey };
    }

    async getOrCreateSessionForUser(userId) {
        if (!userId) return null;

        try {
            const user = await this.internalUserRepository.findById(userId);
            if (!user) {
                console.error(`Error fetching user ${userId}`);
                return null;
            }

            let sessionId = user.whatsapp_session_id;

            if (sessionId) {
                const res = await fetch(`${this.apiUrl}/api/sessions/${sessionId}`, { headers: this.headers });
                if (res.ok) {
                    return sessionId;
                } else {
                    console.log(`Session ${sessionId} not valid on gateway, creating new one...`);
                    sessionId = null;
                }
            }

            if (!sessionId) {
                const newSessionName = `unicrew-${userId}`;
                const createRes = await fetch(`${this.apiUrl}/api/sessions`, {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify({ name: newSessionName })
                });
                const newSession = await createRes.json();

                if (newSession.id) {
                    sessionId = newSession.id;
                    await this.internalUserRepository.updateWhatsappSessionId(userId, sessionId);
                    return sessionId;
                }
            }
        } catch (err) {
            console.error("Error getting session ID:", err);
        }
        return null;
    }

    async getSessionStatus(userId) {
        if (!this.apiUrl) return { status: 'DISCONNECTED', qr: null };
        try {
            const sessionId = await this.getOrCreateSessionForUser(userId);
            if (!sessionId) throw new Error("Could not get session ID");

            const stateRes = await fetch(`${this.apiUrl}/api/sessions/${sessionId}`, { headers: this.headers });
            const stateData = await stateRes.json();

            const connectionState = stateData.status;
            console.log(`OpenWA Session Status for ${sessionId}: ${connectionState}`);

            if (['connected', 'authenticated', 'ready', 'working', 'in-use'].includes(connectionState)) {
                return { status: 'CONNECTED', qr: null, sessionId };
            } else if (connectionState === 'qr_ready') {
                const qrRes = await fetch(`${this.apiUrl}/api/sessions/${sessionId}/qr`, { headers: this.headers });
                const qrData = await qrRes.json();
                return { status: 'QR_READY', qr: qrData.qrCode || qrData.qr, sessionId };
            } else if (['initializing', 'starting', 'authenticating'].includes(connectionState)) {
                return { status: 'STARTING', qr: null, sessionId };
            } else {
                console.log(`Triggering session start for unknown/disconnected state: ${connectionState}`);
                await fetch(`${this.apiUrl}/api/sessions/${sessionId}/start`, { method: 'POST', headers: this.headers });
                return { status: 'STARTING', qr: null, sessionId };
            }
        } catch (err) {
            console.error("OpenWA Status Fetch Error:", err.message);
            return { status: 'STARTING', qr: null };
        }
    }

    // Used by chat sync: resolves the user's session internally.
    async fetchAllChats(userId) {
        try {
            const sessionId = await this.getOrCreateSessionForUser(userId);
            if (!sessionId) throw new Error("No session ID found for user");
            const res = await fetch(`${this.apiUrl}/api/sessions/${sessionId}/chats`, { headers: this.headers });
            const data = await res.json();
            if (Array.isArray(data)) return data;
            if (data.data && Array.isArray(data.data)) return data.data;
            return [];
        } catch (err) {
            console.error("Failed to fetch chats:", err.message);
            return [];
        }
    }

    // Used by chat sync: resolves the user's session internally.
    async getChatMessages(userId, chatId, limit = 5) {
        try {
            const sessionId = await this.getOrCreateSessionForUser(userId);
            if (!sessionId) throw new Error("No session ID found for user");
            const res = await fetch(`${this.apiUrl}/api/sessions/${sessionId}/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`, { headers: this.headers });
            const data = await res.json();
            if (Array.isArray(data)) return data;
            if (data && data.data && Array.isArray(data.data)) return data.data;
            if (data && data.messages && Array.isArray(data.messages)) return data.messages;
            return [];
        } catch (err) {
            console.error(`Failed to fetch messages for ${chatId}:`, err.message);
            return [];
        }
    }

    // Used by the raw proxy routes, which already have a known sessionId from the frontend.
    async getChatsBySessionId(sessionId) {
        const res = await fetch(`${this.apiUrl}/api/sessions/${sessionId}/chats`, { headers: this.headers });
        const data = await res.json();
        return { status: res.status, data };
    }

    async getMessagesBySessionId(sessionId, chatId, limit = 100) {
        const res = await fetch(`${this.apiUrl}/api/sessions/${sessionId}/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`, { headers: this.headers });
        const data = await res.json();
        return { status: res.status, data };
    }

    async sendText(sessionId, chatId, text) {
        const res = await fetch(`${this.apiUrl}/api/sessions/${sessionId}/messages/send-text`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ chatId, text })
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status, data };
    }

    async sendMedia(sessionId, chatId, fileBase64, fileName, caption) {
        const matches = fileBase64.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
            const err = new Error('Invalid base64 file format');
            err.statusCode = 400;
            throw err;
        }
        const mimetype = matches[1];
        const rawBase64 = matches[2];
        let endpointPath = 'send-document';
        if (mimetype.startsWith('image/')) endpointPath = 'send-image';
        else if (mimetype.startsWith('video/')) endpointPath = 'send-video';
        else if (mimetype.startsWith('audio/')) endpointPath = 'send-audio';

        const res = await fetch(`${this.apiUrl}/api/sessions/${sessionId}/messages/${endpointPath}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ chatId, base64: rawBase64, filename: fileName || 'file', caption: caption || '', mimetype })
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status, data };
    }
}

module.exports = WhatsAppService;
