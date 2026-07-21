const cron = require('node-cron');

function startDailyAnalysisCron(contactRepository, contactAnalyzerService) {
    // Run every day at 20:00 (8:00 PM) server time
    cron.schedule('0 20 * * *', async () => {
        console.log('[Cron] Starting daily background AI analysis...');
        try {
            // Get contacts updated in the last 24 hours.
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const contacts = await contactRepository.findUpdatedSince(yesterday);
            console.log(`[Cron] Found ${contacts.length} contacts updated in the last 24h.`);

            for (const contact of contacts) {
                const result = await contactAnalyzerService.runAnalysisForContact(contact);
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
