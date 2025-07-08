// ingest.js
// -----------------------------------
// Script to load Markdown content fragments into Pinecone
// 1) Read the .md files from the 'content/' folder
// 2) Split each file into text chunks (max. 1000 characters)
// 3) Generate embeddings with OpenAI
// 4) Upload the vectors with metadata to your Pinecone index
// -----------------------------------

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');

// OpenAI and Pinecone Configuration
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

async function initPinecone() {
  const client = new PineconeClient();
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  return client.Index(process.env.PINECONE_INDEX);
}

// Function to split text into chunks of maximum size
function chunkText(text, maxLen = 1000) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + maxLen);
        // Adjust to not cut words in half
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks;
}

(async () => {
  try {
    const index = await initPinecone();
    const contentDir = path.join(__dirname, '..', 'src', 'content');
    const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(contentDir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const topicId = path.basename(file, '.md');
      const chunks = chunkText(raw);

      console.log(`Processing '${file}' → ${chunks.length} chunks`);

        // Prepare vectors for upsert
      const vectors = [];

      for (let i = 0; i < chunks.length; i++) {
        const input = chunks[i];
        // Generate embedding
        const res = await openai.createEmbedding({
          model: 'text-embedding-3-small',
          input,
        });
        const [embedding] = res.data.data;
        
        vectors.push({
          id: `${topicId}-chunk-${i}`,
          values: embedding.embedding,
          metadata: {
            topicId,
            chunkIndex: i,
            text: input,
          },
        });
      }

      // Ups to Index
      console.log(`Uploading ${vectors.length} vectors to '${topicId}'...`);
      await index.upsert({ upsertRequest: { vectors } });
      console.log(`¡Ready '${topicId}'!`);
    }

    console.log('Ingestion completed.');
  } catch (err) {
    console.error('Ingestion error:', err);
  }
})();