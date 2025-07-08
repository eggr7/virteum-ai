const express = require('express');
const { init } = require('../services/pinecone');
const { Configuration, OpenAIApi } = require('openai');
const router = express.Router();

const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

router.post('/', async (req, res) => {
  const { message } = req.body;
  const index = await init();

  // 1. Generates embedding from the question
  const embedRes = await openai.createEmbedding({
    model: 'text-embedding-3-small',
    input: message,
  });
  const userVec = embedRes.data.data[0].embedding;

  // 2. Retrieves the 3 chunks more relevants 
  const queryRes = await index.query({
    topK: 3,
    vector: userVec,
    includeMetadata: true,
  });
  const contexts = queryRes.matches.map(m => m.metadata.text);

  // 3. Build prompt with the contexts and the question
  const prompt = `
You are an educational assistant. Use the following excerpts to help answer the student’s question.

Context:
${contexts.join('\n---\n')}

Question: ${message}
`;

  // 4. Call to Chat Completion
  const chatRes = await openai.createChatCompletion({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.2,
  });

  res.json({ reply: chatRes.data.choices[0].message.content });
});

module.exports = router;
