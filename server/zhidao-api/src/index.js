import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dySDK } from '@open-dy/node-server-sdk';

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

// POST /getQuestionConfig (same as GET for gateway compatibility)
app.post('/getQuestionConfig', (req, res) => {
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


// helpers for recommendation
function toAnswerMap(answers) {
  const map = {};
  (answers || []).forEach((a) => { if (a && a.id) map[a.id] = a.value; });
  return map;
}

function isCompatible(userValue, tags, dimension) {
  if (!userValue || !Array.isArray(tags)) return false;
  switch (dimension) {
    case 'light':
      if (userValue === 'low' && (tags.includes('medium') || tags.includes('high'))) return true;
      if (userValue === 'medium' && tags.includes('high')) return true;
      break;
    case 'space':
      if (userValue === 'large' && (tags.includes('medium') || tags.includes('small'))) return true;
      if (userValue === 'medium' && tags.includes('small')) return true;
      break;
    case 'level':
      if (userValue === 'expert' && (tags.includes('intermediate') || tags.includes('beginner'))) return true;
      if (userValue === 'intermediate' && tags.includes('beginner')) return true;
      break;
  }
  return false;
}

function isMatch(userValue, tags, dimension) {
  if (!userValue || !Array.isArray(tags)) return false;
  if (tags.includes(userValue)) return true;
  return isCompatible(userValue, tags, dimension);
}

function scorePlant(answersMap, plant) {
  const weights = { light: 1.2, space: 1.0, level: 1.1 };
  const base = 10;
  let score = 0;
  ['light','space','level'].forEach((dim) => {
    if (isMatch(answersMap[dim], plant.tags || [], dim)) {
      score += base * (weights[dim] || 1);
    }
  });
  return score;
}

// POST /recommendPlants
// req: { answers: Array<{id:string,value:string}>, topN?: number }
// resp: { ok: true, data: Plant[] }
app.post('/recommendPlants', (req, res) => {
  const { answers, topN = 10 } = req.body || {};
  if (!Array.isArray(answers) || answers.length === 0) {
    return badRequest(res, 'answers required');
  }
  const answersMap = toAnswerMap(answers);

  let plants = readJSON('plants.json', []);
  // only onShelf
  plants = plants.filter((x) => x && x.onShelf === true);

  // score and sort
  const scored = plants.map((p) => ({ ...p, score: scorePlant(answersMap, p) }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const data = scored.slice(0, Number(topN) > 0 ? Number(topN) : 10);
  res.json({ ok: true, data });
});

// POST /submitAnswers
// req: { openId?: string, answers: Array<{id:string,value:any}>, clientTs?: number }
// resp: { ok: true }
app.post('/submitAnswers', async (req, res) => {
  const { answers, openId = '', clientTs } = req.body || {};
  if (!Array.isArray(answers) || answers.length === 0) {
    return badRequest(res, 'answers required');
  }
  // minimal shape validation
  const invalid = answers.some((a) => !a || typeof a.id !== 'string');
  if (invalid) return badRequest(res, 'answers item must contain id');

  // prefer openId from gateway header, fallback to body.openId
  let headerOpenId = '';
  let anonymousOpenid = '';
  try {
    const serviceCtx = dySDK.context({ headers: req.headers });
    const ctx = serviceCtx.getContext();
    headerOpenId = ctx?.openId || '';
    anonymousOpenid = ctx?.anonymousOpenid || '';
  } catch (_) {
    // ignore context errors
  }

  const finalOpenId = headerOpenId || openId || anonymousOpenid || '';

  // attempt to persist; failure should not affect response
  try {
    const db = dySDK.database();
    const record = {
      openId: finalOpenId,
      anonymousOpenid: anonymousOpenid || undefined,
      answers,
      clientTs: Number.isFinite(clientTs) ? clientTs : (typeof clientTs === 'number' ? clientTs : undefined),
      createdAt: db.serverDate(),
      source: 'miniapp',
    };
    await db.collection('user_answer').add(record);
  } catch (e) {
    // log but do not fail the request
    console.warn('[submitAnswers] persist skipped:', e?.message || e);
  }

  res.json({ ok: true });
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`[zhidao-api] listening on ${port}`);
});
