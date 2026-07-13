const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { getSessionStatus, fetchAllChats, getChatMessages } = require('./whatsappManager');
const { analyzeContactProfile } = require('./aiService');
const { startDailyAnalysisCron } = require('./cron/dailyAnalysis');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase Client using Service Role to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'; 
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PORT = process.env.PORT || 3001;

// ==========================================
// AI HELPER
// ==========================================

async function applyAiAnalysis(contact, aiData) {
    if (!aiData) return null;

    let updatedFields = contact.fields || [
        { label: "Current High School", value: "" },
        { label: "Target Course", value: "" },
        { label: "Intended Intake", value: "" },
        { label: "Assigned Ambassador", value: "" },
        { label: "Assigned Counselor", value: "" },
        { label: "Source Channel", value: "WhatsApp" }
    ];

    if (aiData.fields) {
        for (const [key, value] of Object.entries(aiData.fields)) {
            if (value) {
                const fieldIndex = updatedFields.findIndex(f => f.label === key);
                if (fieldIndex >= 0) {
                    updatedFields[fieldIndex].value = value;
                } else {
                    updatedFields.push({ label: key, value });
                }
            }
        }
    }

    await supabase
        .from('contacts')
        .update({
            ai_summary: aiData.summary,
            ai_tags: aiData.tags || [],
            enrollment_probability: aiData.probability || 0,
            intent: aiData.intent || 'General',
            fields: updatedFields
        })
        .eq('id', contact.id);

    if (aiData.timeline_update) {
        await supabase.from('interaction_logs').insert({
            contact_id: contact.id,
            sender_type: 'system',
            content: aiData.timeline_update,
            is_read: true,
            is_automated: true
        });
    }

    return {
        ai_summary: aiData.summary,
        ai_tags: aiData.tags || [],
        enrollment_probability: aiData.probability || 0,
        intent: aiData.intent || 'General',
        fields: updatedFields
    };
}

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

app.post('/api/whatsapp/sync', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    try {
        console.log(`[${userId}] Starting Chat Sync from Railway OpenWA...`);
        // 1. Fetch all chats
        const chats = await fetchAllChats();
        console.log(`Found ${chats.length} total chats. Limiting sync to the most recent 50 chats.`);
        
        // Limit to 50
        const recentChats = chats.slice(0, 50);

        // 2. Map and Upsert into Supabase
        for (const chat of recentChats) {
            // OpenWA chat object usually has id (e.g. 123456789@c.us), name, unreadCount
            const phoneNumber = chat.id && typeof chat.id === 'string' ? chat.id.split('@')[0] : chat.id?._serialized?.split('@')[0];
            if (!phoneNumber) continue;

            const name = chat.name || chat.pushname || chat.formattedTitle || phoneNumber;

            // Only sync messages for contacts that already exist in the CRM
            const { data: contact, error: contactError } = await supabase
                .from('contacts')
                .select('id, ai_summary, fields')
                .eq('phone_number', phoneNumber)
                .single();
            
            if (contactError || !contact) {
                // Unknown contact, skip syncing
                continue;
            }

            // Sync recent messages for this chat (limit 5 per chat)
            const msgs = await getChatMessages(chat.id, 5);
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
                const { data: recentLogs } = await supabase
                    .from('interaction_logs')
                    .select('sender_type, content')
                    .eq('contact_id', contact.id)
                    .order('created_at', { ascending: true })
                    .limit(10);
                
                if (recentLogs && recentLogs.length >= 2) {
                    console.log(`[Sync AI] Generating background summary for ${phoneNumber}...`);
                    const aiData = await analyzeContactProfile(contact.id, recentLogs);
                    if (aiData) {
                        await applyAiAnalysis(contact, aiData);
                        console.log(`[Sync AI] Updated profile for ${phoneNumber}`);
                    }
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
                .select('id, ai_summary, fields')
                .eq('phone_number', from)
                .single();

            if (contactError || !contact) {
                // Unknown contact, silently ignore
                return res.status(200).send('Webhook processed (ignored unknown contact)');
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
                        const { data: recentLogs } = await supabase
                            .from('interaction_logs')
                            .select('sender_type, content')
                            .eq('contact_id', contact.id)
                            .order('created_at', { ascending: true })
                            .limit(15);
                        
                        if (recentLogs) {
                            const aiData = await analyzeContactProfile(contact.id, recentLogs);
                            if (aiData) {
                                await applyAiAnalysis(contact, aiData);
                                console.log(`[Webhook AI] Updated profile for ${from}`);
                            }
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
            .select('id, ai_summary, fields')
            .eq('phone_number', phone_number)
            .single();

        if (contactError || !contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        const { data: recentLogs } = await supabase
            .from('interaction_logs')
            .select('sender_type, content')
            .eq('contact_id', contact.id)
            .order('created_at', { ascending: true })
            .limit(15);

        if (!recentLogs || recentLogs.length === 0) {
             return res.status(400).json({ error: 'No interactions found for analysis' });
        }
        
        console.log(`[Manual AI Analysis] Starting analysis for ${phone_number}...`);
        const aiData = await analyzeContactProfile(contact.id, recentLogs);
        
        if (aiData) {
            const updatedProfile = await applyAiAnalysis(contact, aiData);
            console.log(`[Manual AI Analysis] Completed and updated profile for ${phone_number}`);
            return res.json({ success: true, profile: updatedProfile });
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
