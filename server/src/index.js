require('dotenv').config();
const express = require('express');
const cors = require('cors');

const chatRoutes = require('./routes/chat');
const quizRoutes = require('./routes/quiz');
const topicsRoutes = require('./routes/topics');

const app = express();
app.use(cors(), express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/topics', topicsRoutes);

app.listen(process.env.PORT, () =>
  console.log(`Server running on http://localhost:${process.env.PORT}`)
);
