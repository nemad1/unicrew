const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { analyzeContactProfile } = require('./aiService');

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

/**
 * Fetches only the messages the AI hasn't seen yet: everything after
 * contact.last_analyzed_message_at, or the most recent FRESH_ANALYSIS_MESSAGE_CAP
 * messages if this contact has never been analyzed.
 */
async function getDeltaMessages(contact) {
    if (contact.last_analyzed_message_at) {
        const { data } = await supabase
            .from('interaction_logs')
            .select('id, sender_type, content, created_at')
            .eq('contact_id', contact.id)
            .neq('sender_type', 'system') // exclude our own automated timeline notes — otherwise a run's own output becomes "new" input to the next run
            .gt('created_at', contact.last_analyzed_message_at)
            .order('created_at', { ascending: true });
        return data || [];
    }

    // Never analyzed before: take the most recent N, restored to chronological order.
    const { data } = await supabase
        .from('interaction_logs')
        .select('id, sender_type, content, created_at')
        .eq('contact_id', contact.id)
        .neq('sender_type', 'system')
        .order('created_at', { ascending: false })
        .limit(FRESH_ANALYSIS_MESSAGE_CAP);
    return (data || []).reverse();
}

function topByConfidence(signals, n = 3) {
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
async function applyAiAnalysis(contact, aiData, deltaMessages) {
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
        await supabase.from('contact_signals').insert(signalRows);
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

    const topInterests = topByConfidence(aiData.interests);
    const topConcerns = topByConfidence(aiData.concerns);

    await supabase
        .from('contacts')
        .update({
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
async function runAnalysisForContact(contact) {
    const deltaMessages = await getDeltaMessages(contact);
    if (deltaMessages.length === 0) {
        return { status: 'no_new_messages' };
    }

    const existingContext = {
        summary: contact.ai_summary || null,
        intent: contact.intent || null,
        topInterests: contact.top_interests || [],
        topConcerns: contact.top_concerns || [],
    };

    const aiData = await analyzeContactProfile(contact.id, deltaMessages, existingContext);
    if (!aiData) {
        return { status: 'analysis_failed' };
    }

    const profile = await applyAiAnalysis(contact, aiData, deltaMessages);
    return { status: 'ok', profile };
}

module.exports = {
    runAnalysisForContact,
    applyAiAnalysis,
    getDeltaMessages,
};
