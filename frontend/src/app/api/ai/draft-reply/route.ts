import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { prompt, conversationHistory } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set" },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase credentials are not set" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(geminiKey);

    // 1. Embed the student's prompt
    const embeddingModel = genAI.getGenerativeModel({
      model: "gemini-embedding-2",
    });
    const embeddingResult = await embeddingModel.embedContent(prompt);
    const queryEmbedding = embeddingResult.embedding.values;

    // 2. Query Supabase for relevant context
    // Using 0.5 as threshold and top 3 matches
    const { data: documents, error: matchError } = await supabase.rpc(
      "match_documents",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 3,
      }
    );

    if (matchError) {
      console.error("Error matching documents:", matchError);
      return NextResponse.json(
        { error: "Database search failed" },
        { status: 500 }
      );
    }

    const contextText =
      documents && documents.length > 0
        ? documents.map((doc: any) => `${doc.title}\n${doc.content}`).join("\n\n")
        : "No relevant knowledge base articles found.";

    // 3. Construct System Prompt
    const systemInstruction = `You are a helpful university admissions assistant responding to prospective students.
Use the following context from our knowledge base to answer the student's question accurately.
If the context doesn't contain the answer, say you will connect them with an ambassador or counselor.
Do not use Markdown formatting unless necessary.

You must respond with EXACTLY 3 different variations of the reply. Your response must be valid JSON in the following format:
{
  "replies": [
    { "tone": "Friendly", "text": "..." },
    { "tone": "Formal", "text": "..." },
    { "tone": "Concise", "text": "..." }
  ]
}

Context:
${contextText}`;

    // Format conversation history for Gemini
    const contents = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      // Map previous messages to model / user roles
      for (const msg of conversationHistory) {
        // Ignore system messages and automated notes if needed
        if (msg.sender_type === "system") continue;
        
        contents.push({
          role: msg.sender_type === "student" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }
    
    // Always append the current prompt
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    // 4. Generate Draft Reply
    const chatModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const response = await chatModel.generateContent({
      contents: contents,
    });

    const text = response.response.text();
    const parsed = JSON.parse(text);

    return NextResponse.json({ replies: parsed.replies });
  } catch (error: any) {
    console.error("Error in draft-reply API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
