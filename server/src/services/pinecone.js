const { PineconeClient } = require('@pinecone-database/pinecone');
const client = new PineconeClient();

async function init() {
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  return client.Index(process.env.PINECONE_INDEX);
}

module.exports = { init };
