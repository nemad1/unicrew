class AIController {
    constructor({ contactAnalyzerService, contactRepository }) {
        this.contactAnalyzerService = contactAnalyzerService;
        this.contactRepository = contactRepository;
    }

    manualAnalyzeProfile = async (req, res) => {
        const { phone_number } = req.params;

        if (!phone_number) {
            return res.status(400).json({ error: 'phone_number is required' });
        }

        try {
            const contact = await this.contactRepository.findByPhoneNumber(phone_number);

            if (!contact) {
                return res.status(404).json({ error: 'Contact not found' });
            }

            console.log(`[Manual AI Analysis] Starting analysis for ${phone_number}...`);
            const result = await this.contactAnalyzerService.runAnalysisForContact(contact);

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
    };

    // Not part of the original spec's method list, but the source route
    // (/api/contacts/:phone_number/label) was grouped under "CRM Contact
    // Endpoints" alongside manual analysis in the old server.js, and this
    // controller already has the only dependency it needs (contactRepository).
    updateContactLabel = async (req, res) => {
        const { phone_number } = req.params;
        const { name } = req.body;

        if (!phone_number) {
            return res.status(400).json({ error: 'phone_number is required' });
        }

        try {
            const contact = await this.contactRepository.upsertByPhoneNumber(phone_number, name);
            res.json({ success: true, contact });
        } catch (err) {
            console.error("Update label error:", err);
            res.status(500).json({ error: "Internal Error" });
        }
    };
}

module.exports = AIController;
