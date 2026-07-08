const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { getSessionStatus, fetchAllChats, getChatMessages } = require('./whatsappManager');

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

            // Upsert contact
            const { data: contact, error: contactError } = await supabase
                .from('contacts')
                .upsert({ 
                    phone_number: phoneNumber,
                    name: name,
                    channel: 'WhatsApp',
                    unread_count: chat.unreadCount || 0
                }, { onConflict: 'phone_number' })
                .select('id')
                .single();
            
            if (contactError) {
                console.error("Failed to upsert contact:", contactError);
                continue;
            }

            // Sync recent messages for this chat (limit 5 per chat)
            const msgs = await getChatMessages(chat.id, 5);
            for (const msg of msgs) {
                // OpenWA message object has: id, body, fromMe, timestamp
                const content = msg.body || msg.content || "";
                if (!content) continue;

                // Insert message to interaction logs
                // We use insert and let the trigger handle duplicates if we added a unique constraint,
                // but since it's a one-time sync, inserting is fine.
                await supabase
                    .from('interaction_logs')
                    .insert({
                        contact_id: contact.id,
                        sender_type: msg.fromMe ? 'ambassador' : 'student',
                        content: content,
                        is_read: msg.fromMe || chat.unreadCount === 0
                    });
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

        if (from && body) {
            // 1. Upsert contact
            const { data: contact, error: contactError } = await supabase
                .from('contacts')
                .upsert({ phone_number: from }, { onConflict: 'phone_number' })
                .select('id')
                .single();

            if (contactError) throw contactError;

            // 2. Insert message
            const { error: msgError } = await supabase
                .from('interaction_logs')
                .insert({
                    contact_id: contact.id,
                    sender_type: fromMe ? 'ambassador' : 'student',
                    content: body
                });

            if (msgError) throw msgError;
            console.log(`Saved incoming message from ${from}`);
        }
    }

    res.status(200).send('Webhook processed');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
});
