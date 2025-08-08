import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// GET /getQuestionConfig
app.get('/getQuestionConfig', (req, res) => {
  // TODO: connect to DB; here return a mock with version for first deploy
  res.json({ ok: true, version: 'v0', questions: [] });
});

// POST /listPlants
app.post('/listPlants', (req, res) => {
  // TODO: query DB; mock response for first deploy
  res.json({ ok: true, data: [] });
});

// POST /submitAnswers
app.post('/submitAnswers', (req, res) => {
  // TODO: insert to DB; validate shape
  const { answers } = req.body || {};
  if (!answers) return res.status(400).json({ ok: false, error: 'answers required' });
  res.json({ ok: true });
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`[zhidao-api] listening on ${port}`);
});

