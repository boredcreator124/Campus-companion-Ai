import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Middleware
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// --- RAG State (Local JSON Persistence) ---
// We store the full embeddings and text in a local file database.json
const DB_PATH = path.resolve('database.json');
let documentStore = [];

if (fs.existsSync(DB_PATH)) {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        documentStore = JSON.parse(data);
        console.log(`Loaded ${documentStore.length} chunks from local database.`);
    } catch (e) {
        console.error("Failed to load local database", e);
    }
}

function saveDB() {
    fs.writeFileSync(DB_PATH, JSON.stringify(documentStore, null, 2));
}

// Helper: Cosine Similarity for Vector Search
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0; let normA = 0; let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return (normA === 0 || normB === 0) ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper: Embed text and find top matches
async function retrieveSimilarChunks(queryText, sessionId, topK = 3) {
    if (documentStore.length === 0) return [];

    // Filter only documents matching this session
    const sessionDocs = documentStore.filter(doc => doc.sessionId === sessionId);
    if (sessionDocs.length === 0) return [];
    
    // 1. Convert user's question to a vector
    const embResult = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: queryText,
    });
    const queryVector = embResult.embeddings[0].values;

    // 2. Score all document chunks
    const scoredDocs = sessionDocs.map(doc => ({
        ...doc,
        score: cosineSimilarity(queryVector, doc.embedding)
    }));

    // 3. Sort by most relevant (highest score) and return Top K
    scoredDocs.sort((a, b) => b.score - a.score);
    return scoredDocs.slice(0, topK);
}

/**
 * Endpoint 1: Ingest Document Text
 * Breaks uploaded text into chunks and uses Gemini to calculate true semantic vectors.
 */
app.post('/api/ingest', async (req, res) => {
    try {
        let { text, filename, sessionId = 'unknown', base64Image, mimeType } = req.body;
        
        if (!text && !base64Image) return res.status(400).json({ error: "No content provided" });

        console.log(`Ingesting ${filename} for session ${sessionId}...`);
        
        let extractedText = text || "";

        // 1. If image, use Gemini Vision to extract text/content
        if (base64Image) {
            console.log("Image detected! Using Gemini Vision to extract text...");
            const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
            const visionResult = await model.generateContent([
                "Extract all text, equations, and describe the key diagrams or visual information in this study material as accurately as possible.",
                { inlineData: { data: base64Image, mimeType: mimeType || "image/jpeg" } }
            ]);
            extractedText = visionResult.response.text();
            console.log("Vision extraction complete!");
        }

        // 2. Chunk text (simple paragraph chunking)
        const chunks = extractedText.split(/\n\s*\n/).filter(c => c.trim().length > 30);
        console.log(`Split into ${chunks.length} chunks. Generating embeddings...`);

        // 3. Generate Embeddings via Gemini
        const newDocs = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i].trim();
            const embResult = await ai.models.embedContent({
                model: 'text-embedding-004',
                contents: chunkText,
            });
            newDocs.push({
                id: `${filename}-${Date.now()}-chunk-${i}`,
                sessionId,
                filename,
                content: chunkText,
                embedding: embResult.embeddings[0].values
            });
        }

        // 4. Store and Persist
        documentStore = [...documentStore, ...newDocs];
        saveDB();
        console.log(`Ingestion complete! Total stored chunks: ${documentStore.length}`);

        res.json({ success: true, chunksIngested: chunks.length, textExtracted: extractedText.slice(0, 500) + "..." });
    } catch (error) {
        console.error("Ingestion Error:", error);
        res.status(500).json({ error: "Failed to ingest document" });
    }
});

/**
 * Endpoint 2: Chat with Tutor
 * Uses RAG to answer user questions
 */
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId = 'unknown' } = req.body;

        const relevantChunks = await retrieveSimilarChunks(message, sessionId, 3);
        const contextText = relevantChunks.map(c => `[From ${c.filename}]: ${c.content}`).join('\n\n--- \n\n');

        const prompt = `You are a helpful and brilliant academic tutor.
Answer the user's question using ONLY the provided document context below. If the documents don't contain the answer, politely say you don't know based on their materials, but you can offer a general guess. 

Context Materials:
${contextText || 'No documents uploaded yet.'}

User Question: ${message}`;

        const aiStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of aiStream) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error("Chat Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to generate chat response" });
        } else {
            res.end();
        }
    }
});

/**
 * Endpoint 3: Generate Quiz
 */
app.post('/api/quiz', async (req, res) => {
    try {
        const { topic, sessionId = 'unknown' } = req.body;
        
        // Use the topic parameter to do semantic search. If topic is empty, fallback to core concepts.
        const queryText = (topic && topic.trim() !== '') ? topic : "core concepts and essential ideas";
        
        const relevantChunks = await retrieveSimilarChunks(queryText, sessionId, 6);
        const contextText = relevantChunks.map(c => c.content).join('\n---\n');

        const prompt = `You are a rigorous professor. Use the following reading materials to extract key facts and generate a 5-question multiple choice quiz focusing on: ${queryText}.

READING MATERIAL:
${contextText || "No context provided. Generate 5 random trivia questions."}

Format your response EXACTLY as a JSON array of objects. Do not use Markdown code blocks (\`\`\`json), just the raw JSON.
Example format:
[
  {
    "question": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "correctOption": 1
  }
]`;

        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        // Clean JSON string
        let content = aiResponse.text.trim();
        if (content.startsWith("```json")) {
            content = content.substring(7);
            if (content.endsWith("```")) content = content.slice(0, -3);
        }

        res.json({ questions: JSON.parse(content) });

    } catch (error) {
         console.error("Quiz Error:", error);
         res.status(500).json({ error: "Failed to generate quiz" });
    }
});

/**
 * Endpoint: Generate Flashcards
 */
app.post('/api/flashcards', async (req, res) => {
    try {
        const { topic, sessionId = 'unknown' } = req.body;
        const queryText = (topic && topic.trim() !== '') ? topic : "important vocabulary, terms, definitions, and key concepts";
        const relevantChunks = await retrieveSimilarChunks(queryText, sessionId, 6);
        const contextText = relevantChunks.map(c => c.content).join('\n---\n');

        const prompt = `You are a study assistant. Use the following reading materials to extract exactly 10 key terms and their definitions to create flashcards.

READING MATERIAL:
${contextText || "No context provided. Generate 10 random educational definitions."}

Format your response EXACTLY as a JSON array of objects. Do not include Markdown blocks (\`\`\`json).
Example format:
[
  { "front": "Mitosis", "back": "A type of cell division that results in two daughter cells each having the same number and kind of chromosomes as the parent nucleus." }
]`;

        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        let content = aiResponse.text.trim();
        if (content.startsWith("```json")) {
            content = content.substring(7);
            if (content.endsWith("```")) content = content.slice(0, -3);
        }

        res.json({ flashcards: JSON.parse(content) });

    } catch (error) {
         console.error("Flashcards Error:", error);
         res.status(500).json({ error: "Failed to generate flashcards" });
    }
});

/**
 * Endpoint 4: Summarize Topic
 */
app.post('/api/summarize', async (req, res) => {
    try {
        const { topic, sessionId = 'unknown' } = req.body;
        // Retrieve chunks related to the topic (or just all chunks if topic is generic notes)
        const relevantChunks = await retrieveSimilarChunks(topic, sessionId, 6);
        const contextText = relevantChunks.map(c => c.content).join('\n---\n');

        const prompt = `Summarize the following notes into a concise list of bullet points focusing on the most critical information regarding: ${topic}.
        
NOTES:
${contextText || topic}

Only output the bullet points, no introductory text like "Here are the bullet points". Return a plain list separated by newlines.`;

        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        res.json({ summary: aiResponse.text });
    } catch (error) {
        console.error("Summarize Error:", error);
        res.status(500).json({ error: "Failed to generate summary" });
    }
});

/**
 * Endpoint 5: Generate Study Plan
 */
app.post('/api/plan', async (req, res) => {
    try {
        const { targetDate, subjects, sessionId = 'unknown' } = req.body;
        const relevantChunks = await retrieveSimilarChunks(subjects.join(' '), sessionId, 5);
        const contextText = relevantChunks.map(c => c.content).join('\n---\n');

        const prompt = `You are an expert academic planner. Based on the following uploaded context materials, generate a structured study plan up until the target date: ${targetDate}. 
The subjects to cover are: ${subjects.join(', ')}.

Context Materials:
${contextText || "No context materials provided. Use general knowledge."}

Return EXACTLY a JSON array of day blocks. Do not include markdown code ticks (\`\`\`json).
Example format:
[
  {
    "day": "Monday",
    "date": "Oct 15",
    "blocks": [
      { "time": "09:00 - 10:30", "subject": "Math", "task": "Review chapter 1" }
    ]
  }
]`;
        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        let content = aiResponse.text.trim();
        if (content.startsWith("```json")) {
            content = content.substring(7);
            if (content.endsWith("```")) content = content.slice(0, -3);
        }
        res.json({ plan: JSON.parse(content) });

    } catch (error) {
        console.error("Plan Error:", error);
        res.status(500).json({ error: "Failed to generate plan" });
    }
});

app.listen(port, () => {
    console.log(`Campus Companion Backend w/ Gemini RAG running on http://localhost:${port}`);
});
