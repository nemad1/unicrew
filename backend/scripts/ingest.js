require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");

// Validate Env vars
if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env");
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE credentials in .env");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MOCK_DATA = [
  {
    title: "Tuition Fees & Payments",
    content: "The Foundation in Computing program starts from RM 13,900 per semester. The official tuition payment deadline for the Fall semester is scheduled for August 15, 2026. Flexible installment plans are available. Students can also apply for the Excellence Award (requires CGPA 3.5+) or the International Bursary.",
  },
  {
    title: "Campus Life & Accommodation",
    content: "Campus life at the university is vibrant, with over 50 clubs and societies. On-campus accommodation options include premium single rooms and standard twin-sharing rooms. First semester adjustment is supported by dedicated student counselors and ambassadors. The campus features a large library, sports complex, and multiple dining options.",
  },
  {
    title: "Courses & Admissions",
    content: "We offer programs in Computer Science, Business, Engineering, and Design. The BSc (Hons) Computer Science program includes specializations in AI, Cybersecurity, and Data Analytics. To apply, students need a high school diploma or equivalent, with a minimum grade in Mathematics. The admission process takes about 2-3 weeks for international students due to visa processing.",
  },
  {
    title: "Visa & Immigration",
    content: "International students must apply for a Student Pass before arriving. We assist with the EMGS (Education Malaysia Global Services) application. The process typically requires a valid passport (min 18 months validity), academic transcripts, and a medical checkup report. Visa approval letter (VAL) issuance takes about 3-4 weeks.",
  }
];

async function generateEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function ingest() {
  console.log("Starting ingestion...");
  
  for (const doc of MOCK_DATA) {
    console.log(`Processing: ${doc.title}`);
    
    try {
      // 1. Generate embedding
      const embedding = await generateEmbedding(doc.content);
      
      // 2. Insert into Supabase
      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          title: doc.title,
          content: doc.content,
          embedding: embedding,
        });
        
      if (error) {
        console.error(`Error inserting ${doc.title}:`, error);
      } else {
        console.log(`Successfully ingested: ${doc.title}`);
      }
    } catch (err) {
      console.error(`Failed to process ${doc.title}:`, err);
    }
  }
  
  console.log("Ingestion complete.");
}

ingest();
