require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');

const ContactRepository = require('./repositories/ContactRepository');
const InteractionLogRepository = require('./repositories/InteractionLogRepository');
const InternalUserRepository = require('./repositories/InternalUserRepository');

const WhatsAppService = require('./services/WhatsAppService');
const AIService = require('./services/AIService');
const ContactAnalyzerService = require('./services/ContactAnalyzerService');

const WhatsAppController = require('./controllers/WhatsAppController');
const AIController = require('./controllers/AIController');
const KnowledgeBaseController = require('./controllers/KnowledgeBaseController');

const { startDailyAnalysisCron } = require('./cron/dailyAnalysis');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// ==========================================
// GLOBAL CLIENTS
// ==========================================

// Supabase Client using Service Role to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'placeholder_key');

const grokApiKey = process.env.GROK_API_KEY || process.env.OPENAI_API_KEY;
if (!grokApiKey) {
    console.warn("WARNING: GROK_API_KEY or OPENAI_API_KEY is not set. AI features will fail if called.");
}
const openai = new OpenAI({
    apiKey: grokApiKey || 'missing_key_prevent_crash_on_startup',
    baseURL: 'https://api.x.ai/v1',
});

const PORT = process.env.PORT || 3001;

// ==========================================
// REPOSITORIES
// ==========================================
const contactRepository = new ContactRepository(supabase);
const interactionLogRepository = new InteractionLogRepository(supabase);
const internalUserRepository = new InternalUserRepository(supabase);

// ==========================================
// SERVICES
// ==========================================
const whatsAppService = new WhatsAppService({
    apiUrl: process.env.OPENWA_API_URL,
    apiKey: process.env.OPENWA_API_KEY,
    internalUserRepository,
});
const aiService = new AIService(openai);
const contactAnalyzerService = new ContactAnalyzerService({
    aiService,
    contactRepository,
    interactionLogRepository,
    supabase,
});

// ==========================================
// CONTROLLERS
// ==========================================
const whatsAppController = new WhatsAppController({
    whatsAppService,
    contactRepository,
    interactionLogRepository,
    contactAnalyzerService,
    internalUserRepository,
    supabase,
});
const aiController = new AIController({ contactAnalyzerService, contactRepository });
const knowledgeBaseController = new KnowledgeBaseController({ supabase, genAI });

// ==========================================
// WHATSAPP SESSION ENDPOINTS
// ==========================================
app.get('/api/whatsapp/status', whatsAppController.getStatus);

// Proxy routes for Next.js to call OpenWA gateway
app.get('/api/whatsapp/chats', whatsAppController.getChats);
app.get('/api/whatsapp/messages', whatsAppController.getMessages);
app.post('/api/whatsapp/send', whatsAppController.sendText);
app.post('/api/whatsapp/send-media', whatsAppController.sendMedia);
app.post('/api/whatsapp/sync', whatsAppController.syncChats);

// ==========================================
// INCOMING WEBHOOK (For incoming messages)
// ==========================================
app.post('/webhook', whatsAppController.handleWebhook);

// ==========================================
// CRM CONTACT ENDPOINTS
// ==========================================
app.post('/api/ai/analyze/:phone_number', aiController.manualAnalyzeProfile);
app.put('/api/contacts/:phone_number/label', aiController.updateContactLabel);

// ==========================================
// KNOWLEDGE BASE (RAG) ENDPOINTS
// ==========================================
app.post('/api/knowledge-base/upload', upload.single('file'), knowledgeBaseController.uploadDocument);

// Start background cron jobs
startDailyAnalysisCron(contactRepository, contactAnalyzerService);

app.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
});
