require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { getSessionStatus, fetchAllChats, getChatMessages } = require('./whatsappManager');
const { runAnalysisForContact } = require('./aiAnalysisRunner');
const { startDailyAnalysisCron } = require('./cron/dailyAnalysis');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase Client using Service Role to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'; 
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PORT = process.env.PORT || 3001;

// ==========================================
// WHATSAPP SESSION ENDPOINTS
// ==========================================

app.get('/api/whatsapp/status', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    try {
        const statusInfo = await getSessionStatus(userId);
        res.json(statusInfo);
    } catch (err) {
        console.error("Status fetch error:", err);
        res.status(500).json({ error: "Internal Error" });
    }
});

// Proxy routes for Next.js to call OpenWA gateway
const OPENWA_HEADERS = { 'Content-Type': 'application/json', 'X-API-Key': process.env.OPENWA_API_KEY };

app.get('/api/whatsapp/chats', async (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    try {
        const fetchRes = await fetch(`${process.env.OPENWA_API_URL}/api/sessions/${sessionId}/chats`, { headers: OPENWA_HEADERS });
        const data = await fetchRes.json();
        res.status(fetchRes.status).json(data);
    } catch (err) { res.status(500).json({ error: "Internal Error" }); }
});

app.get('/api/whatsapp/messages', async (req, res) => {
    const { sessionId, chatId, limit = '100' } = req.query;
    if (!sessionId || !chatId) return res.status(400).json({ error: 'sessionId and chatId are required' });
    try {
        const fetchRes = await fetch(`${process.env.OPENWA_API_URL}/api/sessions/${sessionId}/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`, { headers: OPENWA_HEADERS });
        const data = await fetchRes.json();
        res.status(fetchRes.status).json(data);
    } catch (err) { res.status(500).json({ error: "Internal Error" }); }
});

app.post('/api/whatsapp/send', async (req, res) => {
    const { sessionId, chatId, text } = req.body;
    if (!sessionId || !chatId || !text) return res.status(400).json({ error: 'Missing parameters' });
    try {
        const fetchRes = await fetch(`${process.env.OPENWA_API_URL}/api/sessions/${sessionId}/messages/send-text`, {
            method: 'POST',
            headers: OPENWA_HEADERS,
            body: JSON.stringify({ chatId, text })
        });
        const data = await fetchRes.json().catch(() => ({}));
        res.status(fetchRes.status).json(data);
    } catch (err) { res.status(500).json({ error: "Internal Error" }); }
});

app.post('/api/whatsapp/send-media', async (req, res) => {
    const { sessionId, chatId, fileBase64, fileName, caption } = req.body;
    if (!sessionId || !chatId || !fileBase64) return res.status(400).json({ error: 'Missing parameters' });
    try {
        const matches = fileBase64.match(/^data:(.+);base64,(.+)$/);
        if (!matches) return res.status(400).json({ error: 'Invalid base64 file format' });
        const mimetype = matches[1];
        const rawBase64 = matches[2];
        let endpointPath = 'send-document';
        if (mimetype.startsWith('image/')) endpointPath = 'send-image';
        else if (mimetype.startsWith('video/')) endpointPath = 'send-video';
        else if (mimetype.startsWith('audio/')) endpointPath = 'send-audio';

        const fetchRes = await fetch(`${process.env.OPENWA_API_URL}/api/sessions/${sessionId}/messages/${endpointPath}`, {
            method: 'POST',
            headers: OPENWA_HEADERS,
            body: JSON.stringify({ chatId, base64: rawBase64, filename: fileName || 'file', caption: caption || '', mimetype })
        });
        const data = await fetchRes.json().catch(() => ({}));
        res.status(fetchRes.status).json(data);
    } catch (err) { res.status(500).json({ error: "Internal Error" }); }
});

app.post('/api/whatsapp/sync', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    try {
        console.log(`[${userId}] Starting Chat Sync from Railway OpenWA...`);
        // 1. Fetch all chats
        const chats = await fetchAllChats(userId);
        console.log(`Found ${chats.length} total chats. Limiting sync to the most recent 50 chats.`);
        
        // Limit to 50
        const recentChats = chats.slice(0, 50);

        // 2. Map and Upsert into Supabase
        for (const chat of recentChats) {
            // OpenWA chat object usually has id (e.g. 123456789@c.us), name, unreadCount
            const phoneNumber = chat.id && typeof chat.id === 'string' ? chat.id.split('@')[0] : chat.id?._serialized?.split('@')[0];
            if (!phoneNumber) continue;

            const name = chat.name || chat.pushname || chat.formattedTitle || phoneNumber;

            let contact;
            const { data: existingContact, error: contactError } = await supabase
                .from('contacts')
                .select('id, ai_summary, intent, fields, top_interests, top_concerns, last_analyzed_message_id, last_analyzed_message_at')
                .eq('phone_number', phoneNumber)
                .single();
            
            if (contactError || !existingContact) {
                // Unknown contact, create it and assign to this user's team
                const { data: profile } = await supabase
                    .from('internal_users')
                    .select('team_id')
                    .eq('id', userId)
                    .single();
                
                const { data: newContact, error: createError } = await supabase
                    .from('contacts')
                    .insert({
                        phone_number: phoneNumber,
                        name: name,
                        channel: 'WhatsApp',
                        team_id: profile ? profile.team_id : null
                    })
                    .select()
                    .single();
                
                if (createError) continue;
                contact = newContact;
            } else {
                contact = existingContact;
            }

            // Sync recent messages for this chat (limit 5 per chat)
            const msgs = await getChatMessages(userId, chat.id, 5);
            for (const msg of msgs) {
                // OpenWA message object has: id, body, fromMe, timestamp
                const content = msg.body || msg.content || msg.text || msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
                if (!content) continue;

                const isFromMe = msg.fromMe !== undefined ? msg.fromMe : msg.direction === 'outgoing';

                await supabase
                    .from('interaction_logs')
                    .insert({
                        contact_id: contact.id,
                        sender_type: isFromMe ? 'ambassador' : 'student',
                        content: content,
                        is_read: isFromMe || chat.unreadCount === 0
                    });
            }

            // Generate AI summary if missing
            if (!contact.ai_summary) {
                console.log(`[Sync AI] Generating background summary for ${phoneNumber}...`);
                const result = await runAnalysisForContact(contact);
                if (result.status === 'ok') {
                    console.log(`[Sync AI] Updated profile for ${phoneNumber}`);
                }
            }
        }

        console.log(`[${userId}] Sync complete!`);
        res.json({ success: true, message: 'Sync complete' });
    } catch (err) {
        console.error("Sync error:", err);
        res.status(500).json({ error: "Internal Error" });
    }
});

// ==========================================
// INCOMING WEBHOOK (For incoming messages)
// ==========================================

app.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    console.log('Received webhook payload');
    
    // OpenWA easy API wraps things
    const eventType = payload.event; // e.g. "onMessage"
    const data = payload.data || payload;

    if (eventType === 'onMessage' || data.body) {
        const fromRaw = data.from || data.chatId;
        const from = fromRaw ? fromRaw.split('@')[0] : 'Unknown';
        const body = data.body || data.content;
        const fromMe = data.fromMe;
        let extractedBody = data.body || data.content || data.text || data.message?.conversation || data.message?.extendedTextMessage?.text;

        if (!extractedBody) {
            if (data.message?.imageMessage) extractedBody = data.message.imageMessage.caption || '[Image]';
            else if (data.message?.videoMessage) extractedBody = data.message.videoMessage.caption || '[Video]';
            else if (data.message?.audioMessage) extractedBody = '[Voice/Audio]';
            else if (data.message?.documentMessage) extractedBody = data.message.documentMessage.fileName || '[Document]';
            else if (data.type) extractedBody = data.caption || `[${data.type}]`;
        }

        if (from && extractedBody) {
            // 1. Check if contact exists in the CRM
            const { data: contact, error: contactError } = await supabase
                .from('contacts')
                .select('id, ai_summary, intent, fields, top_interests, top_concerns, last_analyzed_message_id, last_analyzed_message_at, pending_feedback_for')
                .eq('phone_number', from)
                .single();

            if (contactError || !contact) {
                // Unknown contact, silently ignore
                return res.status(200).send('Webhook processed (ignored unknown contact)');
            }

            // 1b. If we're waiting on a post-enrollment rating from this contact,
            // treat a bare 1-5 reply as feedback for the ambassador instead of a
            // normal chat message, and stop here.
            if (contact.pending_feedback_for && /^[1-5]$/.test(extractedBody.trim())) {
                await supabase.from('ambassador_feedback').insert({
                    contact_id: contact.id,
                    user_id: contact.pending_feedback_for,
                    rating: parseInt(extractedBody.trim(), 10),
                });
                await supabase
                    .from('contacts')
                    .update({ pending_feedback_for: null })
                    .eq('id', contact.id);

                console.log(`Recorded ambassador feedback from ${from}`);
                return res.status(200).send('Webhook processed (feedback recorded)');
            }

            // 2. Insert message
            const { error: msgError } = await supabase
                .from('interaction_logs')
                .insert({
                    contact_id: contact.id,
                    sender_type: fromMe ? 'ambassador' : 'student',
                    content: extractedBody
                });

            if (msgError) throw msgError;
            console.log(`Saved incoming message from ${from}`);

            // 3. Trigger AI Analysis for new contacts asynchronously
            (async () => {
                try {
                    const { count } = await supabase
                        .from('interaction_logs')
                        .select('*', { count: 'exact', head: true })
                        .eq('contact_id', contact.id);

                    if (count === 3 || count === 5 || (!contact.ai_summary && count > 2)) {
                        const result = await runAnalysisForContact(contact);
                        if (result.status === 'ok') {
                            console.log(`[Webhook AI] Updated profile for ${from}`);
                        }
                    }
                } catch (aiErr) {
                    console.error('[Webhook AI] Background analysis error:', aiErr);
                }
            })();
        }
    }

    res.status(200).send('Webhook processed');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ==========================================
// CRM CONTACT ENDPOINTS
// ==========================================

app.post('/api/ai/analyze/:phone_number', async (req, res) => {
    const { phone_number } = req.params;
    
    if (!phone_number) {
        return res.status(400).json({ error: 'phone_number is required' });
    }

    try {
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('id, ai_summary, intent, fields, top_interests, top_concerns, last_analyzed_message_id, last_analyzed_message_at')
            .eq('phone_number', phone_number)
            .single();

        if (contactError || !contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        console.log(`[Manual AI Analysis] Starting analysis for ${phone_number}...`);
        const result = await runAnalysisForContact(contact);

        if (result.status === 'ok') {
            console.log(`[Manual AI Analysis] Completed and updated profile for ${phone_number}`);
            return res.json({ success: true, profile: result.profile });
        } else if (result.status === 'no_new_messages') {
            return res.status(400).json({ error: 'No new messages to analyze since the last run' });
        } else {
            return res.status(500).json({ error: 'Failed to analyze profile' });
        }
    } catch (err) {
        console.error("Manual AI analyze error:", err);
        res.status(500).json({ error: "Internal Error" });
    }
});

app.put('/api/contacts/:phone_number/label', async (req, res) => {
    const { phone_number } = req.params;
    const { name } = req.body;

    if (!phone_number) {
        return res.status(400).json({ error: 'phone_number is required' });
    }

    try {
        // Upsert to ensure we create the contact row if it doesn't exist
        const { data, error } = await supabase
            .from('contacts')
            .upsert({ phone_number, name }, { onConflict: 'phone_number' })
            .select('phone_number, name')
            .single();

        if (error) throw error;

        res.json({ success: true, contact: data });
    } catch (err) {
        console.error("Update label error:", err);
        res.status(500).json({ error: "Internal Error" });
    }
});

// Start background cron jobs
startDailyAnalysisCron();

app.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
});
