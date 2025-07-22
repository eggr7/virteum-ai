// fetch_wikipedia.js
// -----------------------------------
// Script to automate downloading Wikipedia articles and generating Q&As
// 1) Define a list of topics
// 2) For each topic, get the extract (intro) in English from the Wikipedia API
// 3) Ask OpenAI to generate common questions and answers based on that extract
// 4) Save each topic in 'src/content/<topic>/.md' with the text and the Q&A section

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

// OpenAI configuration
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

// List of topics to process
const topics = [
  'Literature',
  'Music',
  'Biology',
  'Chemistry',
  'Mathematics',
  'History',
  'Physics'
];

// Content root folder
const contentRoot = path.join(__dirname, '..', 'src', 'content');

async function fetchExtract(topic) {
  const title = topic.replace(/ /g, '_');
  const url = 'https://en.wikipedia.org/w/api.php';
  const params = {
    action: 'query',
    prop: 'extracts',
    exintro: true,
    explaintext: true,
    redirects: true,
    titles: title,
    format: 'json'
  };
  const resp = await axios.get(url, { params });
  const pages = resp.data.query.pages;
  const page = pages[Object.keys(pages)[0]];
  if (page.missing) throw new Error(`Page not found: ${topic}`);
  return page.extract;
}

async function generateQA(text, topic) {
  const prompt = `
You are an educational assistant. Based on the following content about ${topic}, generate 5 common student questions and their concise answers.

Content:
"""
${text}
"""

Provide output in Markdown as:

## Common Questions
1. **Question 1?** Answer.
2. **Question 2?** Answer.
...`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.7
  });
  return completion.data.choices[0].message.content;
}

(async () => {
  for (const topic of topics) {
    try {
      console.log(`➡️ Processing ${topic}...`);
      // 1. Fetch Wikipedia extract
      const extract = await fetchExtract(topic);

      // 2. Generate Q&A via OpenAI
      const qaSection = await generateQA(extract, topic);

      // 3. Prepare folder and .md file
      const topicDir = path.join(contentRoot, topic.toLowerCase());
      if (!fs.existsSync(topicDir)) fs.mkdirSync(topicDir, { recursive: true });
      const filePath = path.join(topicDir, `${topic.toLowerCase()}.md`);

      // 4. Final content in Markdown
      const markdown = `# ${topic}

${extract}

${qaSection.trim()}`;

      fs.writeFileSync(filePath, markdown, 'utf-8');
      console.log(`✅ Written ${filePath}`);
    } catch (err) {
      console.error(`❌ Error processing ${topic}:`, err.message);
    }
  }
  console.log('🎉 All topics processed.');
})();
