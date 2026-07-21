const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { chunkText } = require('../textChunker');

class KnowledgeBaseController {
    constructor({ supabase, genAI }) {
        this.supabase = supabase;
        this.genAI = genAI;
    }

    uploadDocument = async (req, res) => {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            let textContent = '';

            if (file.mimetype === 'application/pdf') {
                const parsed = await pdfParse(file.buffer);
                textContent = parsed.text;
            } else if (
                file.mimetype === 'application/msword' ||
                file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ) {
                const parsed = await mammoth.extractRawText({ buffer: file.buffer });
                textContent = parsed.value;
            } else {
                return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or Word document.' });
            }

            if (!textContent || !textContent.trim()) {
                return res.status(400).json({ error: 'No text could be extracted from this file' });
            }

            const chunks = chunkText(textContent, 1000);
            const embeddingModel = this.genAI.getGenerativeModel({ model: 'gemini-embedding-2' });

            let insertedCount = 0;
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                try {
                    const result = await embeddingModel.embedContent(chunk);
                    const embedding = result.embedding.values;

                    const { error } = await this.supabase.from('knowledge_base').insert({
                        title: `${file.originalname} (Part ${i + 1})`,
                        content: chunk,
                        embedding,
                        metadata: {
                            source_file: file.originalname,
                            mimetype: file.mimetype,
                            chunk_index: i,
                            chunk_count: chunks.length,
                        },
                    });

                    if (error) {
                        console.error(`Error inserting chunk ${i + 1} of ${file.originalname}:`, error);
                    } else {
                        insertedCount++;
                    }
                } catch (chunkErr) {
                    console.error(`Error embedding chunk ${i + 1} of ${file.originalname}:`, chunkErr);
                }
            }

            res.json({
                success: true,
                fileName: file.originalname,
                totalChunks: chunks.length,
                insertedChunks: insertedCount,
            });
        } catch (err) {
            console.error('Knowledge base upload error:', err);
            res.status(500).json({ error: 'Failed to process document', details: err.message });
        }
    };
}

module.exports = KnowledgeBaseController;
