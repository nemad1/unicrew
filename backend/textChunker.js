function chunkText(text, maxChunkSize = 1000) {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
        if ((currentChunk + paragraph).length > maxChunkSize) {
            if (currentChunk.trim().length > 0) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = paragraph + "\n\n";
        } else {
            currentChunk += paragraph + "\n\n";
        }
    }

    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

module.exports = { chunkText };
