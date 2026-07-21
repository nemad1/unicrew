class WhatsAppController {
    constructor({ whatsAppService, contactRepository, interactionLogRepository, contactAnalyzerService, internalUserRepository, supabase }) {
        this.whatsAppService = whatsAppService;
        this.contactRepository = contactRepository;
        this.interactionLogRepository = interactionLogRepository;
        this.contactAnalyzerService = contactAnalyzerService;
        // Not part of the original spec's attribute list, but needed to resolve
        // a new contact's team on sync, and to record ambassador feedback rows
        // in the webhook (neither table has a dedicated repository yet).
        this.internalUserRepository = internalUserRepository;
        this.supabase = supabase;
    }

    getStatus = async (req, res) => {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId is required' });

        try {
            const statusInfo = await this.whatsAppService.getSessionStatus(userId);
            res.json(statusInfo);
        } catch (err) {
            console.error("Status fetch error:", err);
            res.status(500).json({ error: "Internal Error" });
        }
    };

    getChats = async (req, res) => {
        const { sessionId } = req.query;
        if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
        try {
            const { status, data } = await this.whatsAppService.getChatsBySessionId(sessionId);
            res.status(status).json(data);
        } catch (err) {
            res.status(500).json({ error: "Internal Error" });
        }
    };

    getMessages = async (req, res) => {
        const { sessionId, chatId, limit = '100' } = req.query;
        if (!sessionId || !chatId) return res.status(400).json({ error: 'sessionId and chatId are required' });
        try {
            const { status, data } = await this.whatsAppService.getMessagesBySessionId(sessionId, chatId, limit);
            res.status(status).json(data);
        } catch (err) {
            res.status(500).json({ error: "Internal Error" });
        }
    };

    sendText = async (req, res) => {
        const { sessionId, chatId, text } = req.body;
        if (!sessionId || !chatId || !text) return res.status(400).json({ error: 'Missing parameters' });
        try {
            const { status, data } = await this.whatsAppService.sendText(sessionId, chatId, text);
            res.status(status).json(data);
        } catch (err) {
            res.status(500).json({ error: "Internal Error" });
        }
    };

    sendMedia = async (req, res) => {
        const { sessionId, chatId, fileBase64, fileName, caption } = req.body;
        if (!sessionId || !chatId || !fileBase64) return res.status(400).json({ error: 'Missing parameters' });
        try {
            const { status, data } = await this.whatsAppService.sendMedia(sessionId, chatId, fileBase64, fileName, caption);
            res.status(status).json(data);
        } catch (err) {
            if (err.statusCode === 400) return res.status(400).json({ error: err.message });
            res.status(500).json({ error: "Internal Error" });
        }
    };

    syncChats = async (req, res) => {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId is required' });

        try {
            console.log(`[${userId}] Starting Chat Sync from Railway OpenWA...`);
            const chats = await this.whatsAppService.fetchAllChats(userId);
            console.log(`Found ${chats.length} total chats. Limiting sync to the most recent 50 chats.`);

            const recentChats = chats.slice(0, 50);

            for (const chat of recentChats) {
                const phoneNumber = chat.id && typeof chat.id === 'string' ? chat.id.split('@')[0] : chat.id?._serialized?.split('@')[0];
                if (!phoneNumber) continue;

                const name = chat.name || chat.pushname || chat.formattedTitle || phoneNumber;

                let contact = await this.contactRepository.findByPhoneNumber(phoneNumber);

                if (!contact) {
                    // Unknown contact, create it and assign to this user's team
                    const profile = await this.internalUserRepository.findById(userId);
                    try {
                        contact = await this.contactRepository.create({
                            phone_number: phoneNumber,
                            name: name,
                            channel: 'WhatsApp',
                            team_id: profile ? profile.team_id : null
                        });
                    } catch (createErr) {
                        continue;
                    }
                }

                // Sync recent messages for this chat (limit 5 per chat)
                const msgs = await this.whatsAppService.getChatMessages(userId, chat.id, 5);
                for (const msg of msgs) {
                    const content = msg.body || msg.content || msg.text || msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
                    if (!content) continue;

                    const isFromMe = msg.fromMe !== undefined ? msg.fromMe : msg.direction === 'outgoing';

                    try {
                        await this.interactionLogRepository.create({
                            contact_id: contact.id,
                            sender_type: isFromMe ? 'ambassador' : 'student',
                            content: content,
                            is_read: isFromMe || chat.unreadCount === 0
                        });
                    } catch (msgErr) {
                        // Skip this message, keep syncing the rest of the chat.
                    }
                }

                // Generate AI summary if missing
                if (!contact.ai_summary) {
                    console.log(`[Sync AI] Generating background summary for ${phoneNumber}...`);
                    const result = await this.contactAnalyzerService.runAnalysisForContact(contact);
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
    };

    handleWebhook = async (req, res) => {
        try {
            const payload = req.body;
            console.log('Received webhook payload');

            // OpenWA easy API wraps things
            const eventType = payload.event; // e.g. "onMessage"
            const data = payload.data || payload;

            if (eventType === 'onMessage' || data.body) {
                const fromRaw = data.from || data.chatId;
                const from = fromRaw ? fromRaw.split('@')[0] : 'Unknown';
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
                    const contact = await this.contactRepository.findByPhoneNumber(from);

                    if (!contact) {
                        // Unknown contact, silently ignore
                        return res.status(200).send('Webhook processed (ignored unknown contact)');
                    }

                    // 1b. If we're waiting on a post-enrollment rating from this contact,
                    // treat a bare 1-5 reply as feedback for the ambassador instead of a
                    // normal chat message, and stop here.
                    if (contact.pending_feedback_for && /^[1-5]$/.test(extractedBody.trim())) {
                        await this.supabase.from('ambassador_feedback').insert({
                            contact_id: contact.id,
                            user_id: contact.pending_feedback_for,
                            rating: parseInt(extractedBody.trim(), 10),
                        });
                        try {
                            await this.contactRepository.update(contact.id, { pending_feedback_for: null });
                        } catch (err) {
                            console.error('Failed to clear pending_feedback_for:', err);
                        }

                        console.log(`Recorded ambassador feedback from ${from}`);
                        return res.status(200).send('Webhook processed (feedback recorded)');
                    }

                    // 2. Insert message
                    await this.interactionLogRepository.create({
                        contact_id: contact.id,
                        sender_type: fromMe ? 'ambassador' : 'student',
                        content: extractedBody
                    });

                    console.log(`Saved incoming message from ${from}`);

                    // 3. Trigger AI Analysis for new contacts asynchronously
                    (async () => {
                        try {
                            const count = await this.interactionLogRepository.countByContactId(contact.id);

                            if (count === 3 || count === 5 || (!contact.ai_summary && count > 2)) {
                                const result = await this.contactAnalyzerService.runAnalysisForContact(contact);
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
    };
}

module.exports = WhatsAppController;
