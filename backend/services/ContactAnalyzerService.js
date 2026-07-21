const crypto = require('crypto');

// How many recent messages to pull when a contact has never been analyzed
// before (no last_analyzed_message_id to delta off of yet).
const FRESH_ANALYSIS_MESSAGE_CAP = 20;

const DEFAULT_FIELDS = [
    { label: "Current High School", value: "" },
    { label: "Target Course", value: "" },
    { label: "Intended Intake", value: "" },
    { label: "Assigned Ambassador", value: "" },
    { label: "Assigned Counselor", value: "" },
    { label: "Source Channel", value: "WhatsApp" }
];

class ContactAnalyzerService {
    constructor({ aiService, contactRepository, interactionLogRepository, supabase }) {
        this.aiService = aiService;
        this.contactRepository = contactRepository;
        this.interactionLogRepository = interactionLogRepository;
        this.supabase = supabase;
    }

    /**
     * Fetches only the messages the AI hasn't seen yet: everything after
     * contact.last_analyzed_message_at, or the most recent FRESH_ANALYSIS_MESSAGE_CAP
     * messages if this contact has never been analyzed.
     */
    async getDeltaMessages(contact) {
        if (contact.last_analyzed_message_at) {
            return this.interactionLogRepository.getMessagesAfter(contact.id, contact.last_analyzed_message_at);
        }

        // Never analyzed before: take the most recent N, restored to chronological order.
        const recent = await this.interactionLogRepository.findRecentByContactId(contact.id, FRESH_ANALYSIS_MESSAGE_CAP);
        return recent.reverse();
    }

    topByConfidence(signals, n = 3) {
        return [...(signals || [])]
            .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
            .slice(0, n)
            .map(s => ({
                label: s.label,
                confidence: s.confidence,
                ...(s.sentiment ? { sentiment: s.sentiment } : {})
            }));
    }

    /**
     * Writes one analysis result to the DB. Exactly 2 round trips:
     * one batch insert into contact_signals, one update on contacts.
     * (Plus an optional 3rd, pre-existing call to log a timeline event,
     * which only fires when Grok actually returned a timeline_update.)
     */
    async applyAiAnalysis(contact, aiData, deltaMessages) {
        if (!aiData) return null;

        const batchId = crypto.randomUUID();
        const newestMessage = deltaMessages[deltaMessages.length - 1] || null;

        const signalRows = [
            ...(aiData.intents || []).map(s => ({ ...s, signal_type: 'intent' })),
            ...(aiData.interests || []).map(s => ({ ...s, signal_type: 'interest' })),
            ...(aiData.concerns || []).map(s => ({ ...s, signal_type: 'concern' })),
        ].map(s => ({
            contact_id: contact.id,
            signal_type: s.signal_type,
            label: s.label,
            confidence: s.confidence,
            sentiment: s.sentiment || null,
            source_message_id: newestMessage ? newestMessage.id : null,
            analysis_batch_id: batchId,
        }));

        if (signalRows.length > 0) {
            const { error } = await this.supabase.from('contact_signals').insert(signalRows);
            if (error) console.error('[Contact Analyzer] Failed to insert contact_signals:', error);
        }

        let updatedFields = contact.fields || DEFAULT_FIELDS;
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

        const topInterests = this.topByConfidence(aiData.interests);
        const topConcerns = this.topByConfidence(aiData.concerns);

        try {
            await this.contactRepository.update(contact.id, {
                ai_summary: aiData.summary,
                // Legacy freeform tag list, kept populated (from the new interest
                // signals) so the current UI — which still reads ai_tags — doesn't
                // regress until the display layer is migrated to top_interests.
                ai_tags: topInterests.map(i => i.label),
                enrollment_probability: aiData.probability || 0,
                intent: aiData.intent || 'General',
                fields: updatedFields,
                top_interests: topInterests,
                top_concerns: topConcerns,
                last_analyzed_message_id: newestMessage ? newestMessage.id : contact.last_analyzed_message_id,
                last_analyzed_message_at: newestMessage ? newestMessage.created_at : contact.last_analyzed_message_at,
                last_signals_updated_at: new Date().toISOString(),
            });
        } catch (err) {
            console.error('[Contact Analyzer] Failed to update contact profile:', err);
        }

        if (aiData.timeline_update) {
            try {
                await this.interactionLogRepository.create({
                    contact_id: contact.id,
                    sender_type: 'system',
                    content: aiData.timeline_update,
                    is_read: true,
                    is_automated: true
                });
            } catch (err) {
                console.error('[Contact Analyzer] Failed to log timeline event:', err);
            }
        }

        return {
            ai_summary: aiData.summary,
            ai_tags: topInterests.map(i => i.label),
            enrollment_probability: aiData.probability || 0,
            intent: aiData.intent || 'General',
            fields: updatedFields,
            top_interests: topInterests,
            top_concerns: topConcerns,
        };
    }

    /**
     * Single entry point used by every trigger site (webhook, manual endpoint,
     * sync, cron): fetches only the unseen messages, runs the delta analysis,
     * and applies the result.
     *
     * Returns a discriminated result so callers can tell "nothing new to
     * analyze" (not an error) apart from "the Grok call actually failed":
     *   { status: 'no_new_messages' }
     *   { status: 'analysis_failed' }
     *   { status: 'ok', profile }
     */
    async runAnalysisForContact(contact) {
        const deltaMessages = await this.getDeltaMessages(contact);
        if (deltaMessages.length === 0) {
            return { status: 'no_new_messages' };
        }

        const existingContext = {
            summary: contact.ai_summary || null,
            intent: contact.intent || null,
            topInterests: contact.top_interests || [],
            topConcerns: contact.top_concerns || [],
        };

        const aiData = await this.aiService.analyzeContactProfile(contact.id, deltaMessages, existingContext);
        if (!aiData) {
            return { status: 'analysis_failed' };
        }

        const profile = await this.applyAiAnalysis(contact, aiData, deltaMessages);
        return { status: 'ok', profile };
    }
}

module.exports = ContactAnalyzerService;
