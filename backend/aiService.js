const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.GROK_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

/**
 * Prompts Grok to analyze a contact's profile based on their conversation history.
 * @param {string} contactId 
 * @param {Array} messagesArray Array of message objects: { sender_type, content }
 * @returns {Promise<Object>} JSON containing summary, tags, probability, and intent.
 */
async function analyzeContactProfile(contactId, messagesArray) {
    if (!messagesArray || messagesArray.length === 0) {
        return null;
    }

    // Format transcript
    const transcript = messagesArray.map(m => `[${m.sender_type.toUpperCase()}]: ${m.content}`).join('\n');

    const prompt = `You are an expert university admissions analyst. Read the following conversation transcript between a student and an ambassador or AI. 
Analyze the student's profile and provide the output in strict JSON format. Do not include markdown formatting or backticks, just the raw JSON object.

The JSON MUST have the following structure exactly:
{
  "summary": "A concise 2-3 sentence summary of the student's current status and concerns.",
  "tags": ["Tag1", "Tag2"], // Array of strings representing interests (e.g. "Computer Science", "Scholarship", "Accommodation")
  "probability": 50, // Integer from 0-100 estimating likelihood to enroll
  "intent": "Courses", // EXACTLY ONE of: 'Fees', 'Campus Life', 'Visa & Immigration', 'Courses', 'Housing', 'Booking', 'Escalated', 'General'
  "fields": {
    "Current High School": "Name of high school or null",
    "Target Course": "Name of target course or null",
    "Intended Intake": "Intake date or semester or null"
  },
  "timeline_update": "A single sentence summarizing the main action or request in this conversation, or null if nothing significant."
}

Transcript:
${transcript}`;

    try {
        const response = await openai.chat.completions.create({
            model: "grok-4.5", 
            messages: [
                { role: "system", content: "You are a helpful assistant that outputs strict JSON." },
                { role: "user", content: prompt }
            ],
            temperature: 0.1
        });

        let content = response.choices[0].message.content;
        
        // Strip markdown backticks if the model ignores the instruction
        if (content.startsWith('\`\`\`json')) {
            content = content.replace(/^\`\`\`json/m, '').replace(/\`\`\`$/m, '').trim();
        } else if (content.startsWith('\`\`\`')) {
            content = content.replace(/^\`\`\`/m, '').replace(/\`\`\`$/m, '').trim();
        }

        return JSON.parse(content);
    } catch (error) {
        console.error(`[AI Service] Error analyzing profile for contact ${contactId}:`, error);
        return null;
    }
}

module.exports = {
    analyzeContactProfile
};
