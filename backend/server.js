const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { startSession, getSessionStatus } = require('./whatsappManager');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase Client using Service Role to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'; // Placeholder
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PORT = process.env.PORT || 3000;

// ==========================================
// WHATSAPP SESSION ENDPOINTS
// ==========================================

app.get('/api/whatsapp/status', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Get current status
    let statusInfo = getSessionStatus(userId);
    
    // If DISCONNECTED, programmatically spin up the instance
    if (statusInfo.status === 'DISCONNECTED') {
        startSession(userId).catch(err => console.error(`[${userId}] Failed to start session:`, err));
        // Return STARTING to let the UI know it's booting up
        return res.json({ status: 'STARTING' }); 
    }

    res.json(statusInfo);
});

// Optional manual start endpoint
app.post('/api/whatsapp/start', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    await startSession(userId);
    res.json({ success: true, message: 'Session started' });
});

// ==========================================
// INCOMING WEBHOOK (For incoming messages)
// ==========================================

app.post('/webhook', async (req, res) => {
  try {
    console.log('Received webhook payload:', JSON.stringify(req.body, null, 2));
    
    // Note: Adjust destructuring based on the exact Baileys/OpenWA payload shape
    const { from, body, isAutomated } = req.body; 

    if (from && body) {
        // 1. Upsert contact
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .upsert({ phone_number: from }, { onConflict: 'phone_number' })
            .select('id')
            .single();

        if (contactError) throw contactError;

        // 2. Insert message (triggers auto-prune)
        const { error: msgError } = await supabase
            .from('interaction_logs')
            .insert({
                contact_id: contact.id,
                sender_type: 'student',
                content: body,
                is_automated: isAutomated || false
            });

        if (msgError) throw msgError;
        console.log(`Saved message from ${from}`);
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
