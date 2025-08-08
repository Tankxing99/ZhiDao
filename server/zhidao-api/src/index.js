import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

function readJSON(relPath, fallback) {
  try {
    const p = path.join(__dirname, '..', 'data', relPath);
    const txt = fs.readFileSync(p, 'utf-8');
    return JSON.parse(txt);
  } catch (e) {
    return fallback;
  }
}

// unify error response
function badRequest(res, message) {
  return res.status(400).json({ ok: false, code: 'BAD_REQUEST', message });
}

// health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// GET /getQuestionConfig
// resp: { ok: true, version: string, questions: Array }
app.get('/getQuestionConfig', (req, res) => {
  const cfg = readJSON('question_config.json', { version: 'v0', questions: [] });
  res.json({ ok: true, version: cfg.version, questions: cfg.questions });
});

// POST /listPlants
// req: { page?: number, pageSize?: number, tags?: string[] }
// resp: { ok: true, data: Plant[], total: number, page: number, pageSize: number }
app.post('/listPlants', (req, res) => {
  const { page = 1, pageSize = 10, tags = [] } = req.body || {};
  const p = Number(page);
  const ps = Number(pageSize);
  if (!Number.isFinite(p) || p < 1) return badRequest(res, 'page must be >=1');
  if (!Number.isFinite(ps) || ps < 1 || ps > 100) return badRequest(res, 'pageSize must be 1~100');

  let plants = readJSON('plants.json', []);
  // filter onShelf=true
  plants = plants.filter((x) => x && x.onShelf === true);
  // filter by tags (all included)
  if (Array.isArray(tags) && tags.length > 0) {
    const set = new Set(tags);
    plants = plants.filter((x) => (x.tags || []).every ? tags.every((t) => (x.tags || []).includes(t)) : true);
  }
  // sort by updatedAt desc
  plants.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const total = plants.length;
  const start = (p - 1) * ps;
  const data = plants.slice(start, start + ps);
  res.json({ ok: true, data, total, page: p, pageSize: ps });
});

// POST /submitAnswers
// req: { openId?: string, answers: Array<{id:string,value:any}>, clientTs?: number }
// resp: { ok: true }
app.post('/submitAnswers', (req, res) => {
  const { answers, openId = '', clientTs } = req.body || {};
  if (!Array.isArray(answers) || answers.length === 0) {
    return badRequest(res, 'answers required');
  }
  // minimal shape validation
  const invalid = answers.some((a) => !a || typeof a.id !== 'string');
  if (invalid) return badRequest(res, 'answers item must contain id');

  // In this phase we only accept and return ok. DB persistence will be added next.
  res.json({ ok: true });
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`[zhidao-api] listening on ${port}`);
});
