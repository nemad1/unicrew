const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const { analyzeContactProfile } = require('../aiService');

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
                .select('id')
                .gte('updated_at', yesterday);

            if (error) throw error;
            console.log(`[Cron] Found ${contacts.length} contacts updated in the last 24h.`);

            for (const contact of contacts) {
                // Fetch recent logs
                const { data: recentLogs } = await supabase
                    .from('interaction_logs')
                    .select('sender_type, content, created_at')
                    .eq('contact_id', contact.id)
                    .order('created_at', { ascending: true })
                    .limit(20);

                if (recentLogs && recentLogs.length > 0) {
                    const aiData = await analyzeContactProfile(contact.id, recentLogs);
                    if (aiData) {
                        await supabase
                            .from('contacts')
                            .update({
                                ai_summary: aiData.summary,
                                ai_tags: aiData.tags || [],
                                enrollment_probability: aiData.probability || 0,
                                intent: aiData.intent || 'General'
                            })
                            .eq('id', contact.id);
                        
                        console.log(`[Cron] Updated profile for contact ${contact.id}`);
                    }
                }
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
