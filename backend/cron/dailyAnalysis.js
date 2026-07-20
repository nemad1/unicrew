const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const { runAnalysisForContact } = require('../aiAnalysisRunner');

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function startDailyAnalysisCron() {
    // Run every day at 20:00 (8:00 PM) server time
    cron.schedule('0 20 * * *', async () => {
        console.log('[Cron] Starting daily background AI analysis...');
        try {
            // Get contacts updated in the last 24 hours.
            // Assuming updated_at works, or we process active ones.
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            const { data: contacts, error } = await supabase
                .from('contacts')
                .select('id, ai_summary, intent, fields, top_interests, top_concerns, last_analyzed_message_id, last_analyzed_message_at')
                .gte('updated_at', yesterday);

            if (error) throw error;
            console.log(`[Cron] Found ${contacts.length} contacts updated in the last 24h.`);

            for (const contact of contacts) {
                const result = await runAnalysisForContact(contact);
                if (result.status === 'ok') {
                    console.log(`[Cron] Updated profile for contact ${contact.id}`);
                } else if (result.status === 'analysis_failed') {
                    console.error(`[Cron] Analysis failed for contact ${contact.id}`);
                }
                // 'no_new_messages' is a silent no-op — nothing changed since the last run.
            }
            console.log('[Cron] Daily background AI analysis complete.');
        } catch (err) {
            console.error('[Cron] Error during daily AI analysis:', err);
        }
    });
    console.log('Daily Analysis Cron Job registered (Runs at 8:00 PM).');
}

module.exports = {
    startDailyAnalysisCron
};
