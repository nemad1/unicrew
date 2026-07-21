class AIService {
    constructor(openai) {
        this.openai = openai;
    }

    /**
     * Prompts Grok to incrementally analyze a contact's profile.
     *
     * Delta contract: `messagesArray` is NOT the full transcript — it's only the
     * messages the caller hasn't analyzed yet (everything after
     * contact.last_analyzed_message_id, or the most recent ~20 messages if this
     * contact has never been analyzed before). `existingContext` carries a recap
     * of what a previous run already established, so the model updates its
     * understanding incrementally instead of judging the student off a handful
     * of new lines in isolation.
     *
     * @param {string} contactId
     * @param {Array} messagesArray Array of NEW message objects: { sender_type, content }
     * @param {Object} [existingContext] Recap of prior analysis state
     * @param {string|null} [existingContext.summary]
     * @param {string|null} [existingContext.intent]
     * @param {Array<{label:string,confidence:number}>} [existingContext.topInterests]
     * @param {Array<{label:string,confidence:number,sentiment?:string}>} [existingContext.topConcerns]
     * @returns {Promise<Object>} JSON containing summary, probability, intent,
     *   intents[], interests[], concerns[], fields, and timeline_update.
     */
    async analyzeContactProfile(contactId, messagesArray, existingContext = {}) {
        if (!messagesArray || messagesArray.length === 0) {
            return null;
        }

        // Format transcript (delta only — new messages since the last analysis run)
        const transcript = messagesArray.map(m => `[${m.sender_type.toUpperCase()}]: ${m.content}`).join('\n');

        const { summary: priorSummary, intent: priorIntent, topInterests, topConcerns } = existingContext;

        const formatSignalList = (signals) =>
            signals && signals.length > 0
                ? signals.map(s => `${s.label} (${Math.round((s.confidence || 0) * 100)}%)`).join(', ')
                : 'None yet';

        const recap = `Prior known state (from earlier analysis runs, may be empty if this is the first run):
- Summary so far: ${priorSummary || 'None yet'}
- Primary intent so far: ${priorIntent || 'General'}
- Known interests: ${formatSignalList(topInterests)}
- Known concerns: ${formatSignalList(topConcerns)}`;

        const prompt = `You are an expert university admissions analyst. You previously analyzed this student's conversation; below is a recap of what you already know, followed by only the NEW messages exchanged since then. Update your understanding incrementally using the recap plus the new messages together — do not judge the student off the new messages in isolation.

${recap}

New messages since last analysis:
${transcript}

Analyze the full picture (prior state + new messages) and provide the output in strict JSON format. Do not include markdown formatting or backticks, just the raw JSON object.

The JSON MUST have the following structure exactly:
{
  "summary": "A concise 2-3 sentence summary of the student's current status and concerns, reflecting the full picture, not just the new messages.",
  "probability": 50, // Integer from 0-100 estimating likelihood to enroll
  "intent": "Courses", // EXACTLY ONE of: 'Fees', 'Campus Life', 'Visa & Immigration', 'Courses', 'Housing', 'Booking', 'Escalated', 'General'. Must equal the "label" of the highest-confidence entry in "intents" below.
  "intents": [{"label": "Courses", "confidence": 0.9}], // One or more intent signals observed, each confidence 0-1
  "interests": [{"label": "Computer Science", "confidence": 0.8}], // Topics/programs/benefits the student showed interest in, each confidence 0-1
  "concerns": [{"label": "Visa Delay", "confidence": 0.7, "sentiment": "negative"}], // Objections/hesitations/worries raised, each confidence 0-1, sentiment is one of 'positive' | 'neutral' | 'negative'
  "fields": {
    "Current High School": "Name of high school or null",
    "Target Course": "Name of target course or null",
    "Intended Intake": "Intake date or semester or null"
  },
  "timeline_update": "A single sentence summarizing the main action or request in the NEW messages, or null if nothing significant."
}`;

        try {
            const response = await this.openai.chat.completions.create({
                model: "grok-4.5",
                messages: [
                    { role: "system", content: "You are a helpful assistant that outputs strict JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1
            });

            let content = response.choices[0].message.content;

            // Strip markdown backticks if the model ignores the instruction
            if (content.startsWith('```json')) {
                content = content.replace(/^```json/m, '').replace(/```$/m, '').trim();
            } else if (content.startsWith('```')) {
                content = content.replace(/^```/m, '').replace(/```$/m, '').trim();
            }

            return JSON.parse(content);
        } catch (error) {
            console.error(`[AI Service] Error analyzing profile for contact ${contactId}:`, error);
            return null;
        }
    }
}

module.exports = AIService;
