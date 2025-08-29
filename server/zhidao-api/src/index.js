import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dySDK } from '@open-dy/node-server-sdk';

// 导入增强版推荐算法（需要转换为ES模块兼容格式）
// 注意：由于当前是ES模块环境，需要确保工具类也支持ES模块
// 这里先用简化版本，后续可以完善模块导入

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


// 统一查询函数：获取题库配置（优先动态问卷，随后传统问卷，最后文件回退）
async function fetchQuestionConfig(db){
  // 1) 动态问卷：支持多字段路径
  const dyn = await db.collection('question_config')
    .where({
      $or: [
        { type: 'dynamic_questionnaire' },
        { questionBank: { $exists: true } },
        { 'config.questions': { $exists: true } },
        { active: { $exists: true } }
      ]
    })
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get();
  if(dyn && dyn.data && dyn.data.length>0){
    const config = dyn.data[0];
    const questionBank = config.questionBank || (config.config && config.config.questions) || config.questions;
    if(Array.isArray(questionBank) && questionBank.length>0){
      return {
        ok:true,
        version: config.version || (config.config && config.config.version) || 'v2.1',
        questionBank,
        supportsDynamicQuestionnaire: true
      };
    }
  }
  // 2) 传统问卷：组合为数组
  const fb = await db.collection('question_config')
    .where({
      $and: [
        { type: { $ne: 'dynamic_questionnaire' } },
        { questionBank: { $exists: false } },
        { 'config.questions': { $exists: false } },
        { active: { $exists: false } },
        { question: { $exists: true } }
      ]
    })
    .orderBy('updatedAt', 'desc')
    .limit(5)
    .get();
  if(fb && fb.data && fb.data.length>0){
    const questions = fb.data.map(doc=>({ question: doc.question, type: doc.type, options: doc.options }));
    return { ok:true, version:'v1.0', questions, supportsDynamicQuestionnaire:false };
  }
  // 3) 文件回退
  const cfg = readJSON('question_config.json', { version:'v0', questions: [] });
  return { ok:true, version: cfg.version, questions: cfg.questions, supportsDynamicQuestionnaire:false };
}

// health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// GET /getQuestionConfig - 问卷配置（使用数据库）
// query: { phase?: string, userProfile?: string }
// resp: { ok: true, version: string, questionBank?: Object, questions?: Array }
app.get('/getQuestionConfig', async (req, res) => {
  try {
    const db = dySDK.database();
    const payload = await fetchQuestionConfig(db);
    return res.json(payload);
  } catch (error) {
    console.error('[getQuestionConfig][GET] error:', error);
    const cfg = readJSON('question_config.json', { version: 'v0', questions: [] });
    return res.json({ ok:true, version: cfg.version, questions: cfg.questions, supportsDynamicQuestionnaire:false });
  }
});

// Debug endpoint to check database content
app.get('/debugQuestionConfig', async (req, res) => {
  try {
    const db = dySDK.database();

    // 查询所有题库配置数据
    const allConfigs = await db.collection('question_config').get();

    res.json({
      ok: true,
      message: 'Debug info for question_config collection',
      totalCount: allConfigs.data ? allConfigs.data.length : 0,
      configs: allConfigs.data || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {

// --- 简易性能统计（内存级，仅dev观测用，生产可换为持久化） ---
const perfStats = {
  listPlants: [],
  recommendPlants: [],
  push(name, ms, fallback=false){
    const arr = this[name]; if(!arr) return;
    arr.push({ ms, fallback, ts: Date.now() });
    if(arr.length>500) arr.shift();
  },
  percentiles(name){
    const arr = (this[name]||[]).map(x=>x.ms).slice().sort((a,b)=>a-b);
    const pick = (p)=> arr.length? arr[Math.min(arr.length-1, Math.floor((p/100)*arr.length))]:0;
    return { p50: pick(50), p95: pick(95), count: arr.length };
  },
  fallbackRate(name){
    const arr = this[name]||[]; if(arr.length===0) return 0;
    const n = arr.filter(x=>x.fallback).length; return Math.round((n/arr.length)*100)/100;
  }
};

    console.error('[debugQuestionConfig] error:', error);
    res.json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /getQuestionConfig (same as GET for gateway compatibility)
app.post('/getQuestionConfig', async (req, res) => {
  try {

	  const tStart = Date.now();
	  let usedFallback = false;

    const db = dySDK.database();
    const payload = await fetchQuestionConfig(db);
    return res.json(payload);
  } catch (error) {
    console.error('[getQuestionConfig][POST] error:', error);
    const cfg = readJSON('question_config.json', { version: 'v0', questions: [] });
    return res.json({ ok:true, version: cfg.version, questions: cfg.questions, supportsDynamicQuestionnaire:false });
  }
});


// POST /listPlants - 植物列表（使用数据库）
// req: { page?: number, pageSize?: number, tags?: string[], userProfile?: Object }
// resp: { ok: true, data: Plant[], total: number, page: number, pageSize: number }
app.post('/listPlants', async (req, res) => {
  const { page = 1, pageSize = 10, tags = [], userProfile = {} } = req.body || {};
  const p = Number(page);
  const ps = Number(pageSize);
  if (!Number.isFinite(p) || p < 1) return badRequest(res, 'page must be >=1');
  if (!Number.isFinite(ps) || ps < 1 || ps > 100) return badRequest(res, 'pageSize must be 1~100');

  try {
    const db = dySDK.database();

    // 基础条件：仅返回上架商品
    const baseWhere = { onShelf: true };

    // 按是否有 tags 条件决定查询策略
    let data = [];
    let total = 0;

    if (Array.isArray(tags) && tags.length > 0) {
      // 策略A：尝试在DB侧进行标签过滤（如不支持$all则会抛错，进入fallback）
      try {
        const tagQuery = { ...baseWhere, tags: { $all: tags } };
        const listRes = await db.collection('plants')
          .where(tagQuery)
          .orderBy('updatedAt', 'desc')
          .skip((p - 1) * ps)
          .limit(ps)
          .get();
        data = listRes.data || [];
        // total 估算：再查一遍仅取count（若不支持count，fallback到内存计数）
        try {
          const allRes = await db.collection('plants')
            .where(tagQuery)
            .get();
          total = (allRes && allRes.data) ? allRes.data.length : data.length;
        } catch (_) {
          total = data.length;
        }
      } catch (e) {
        // Fallback：全量上架后内存过滤（兼容不支持$all的环境）
        const result = await db.collection('plants')
          .where(baseWhere)
          .orderBy('updatedAt', 'desc')
          .get();
        let plants = result.data || [];
        plants = plants.filter(plant => {
          const plantTags = plant.tags || [];
          return tags.every(tag => plantTags.includes(tag));
        });
        total = plants.length;
        const start = (p - 1) * ps;
        data = plants.slice(start, start + ps);
      }
    } else {
      // 策略B：无标签筛选，走纯DB分页
      const listRes = await db.collection('plants')
        .where(baseWhere)
        .orderBy('updatedAt', 'desc')
        .skip((p - 1) * ps)
        .limit(ps)
        .get();
      data = listRes.data || [];
      // 估算总数（如无count，做一次轻量获取全部后取length；若数据量大可后续优化为服务端count接口）
      try {
        const allRes = await db.collection('plants')
          .where(baseWhere)
          .get();
        total = (allRes && allRes.data) ? allRes.data.length : data.length;
      } catch (_) {
        total = data.length;
      }
    }

    // 安全过滤（仍在内存中基于画像做软硬过滤）
    if (userProfile.hasPets) {
      data = data.filter(plant => {
        const plantTags = plant.tags || [];
        return !plantTags.some(tag => ['pet_toxic', 'toxic-to-cats', 'toxic-to-dogs'].includes(tag));
      });
    }
    if (userProfile.hasChildren) {
      data = data.filter(plant => {
        const plantTags = plant.tags || [];
        return !plantTags.some(tag => ['child_unsafe', 'toxic-if-ingested', 'sharp-spines'].includes(tag));
      });
    }

    res.json({ ok: true, data, total, page: p, pageSize: ps });

	    const elapsed = Date.now() - tStart;
	    try{
	      perfStats.push('listPlants', elapsed, usedFallback);
	      const psnap = perfStats.percentiles('listPlants');
	      const frate = perfStats.fallbackRate('listPlants');
	      console.log('[listPlants][perf]', { elapsed, p50: psnap.p50, p95: psnap.p95, count: psnap.count, fallbackRate: frate });
	    }catch(_){ }


  } catch (error) {
    console.error('[listPlants] database error:', error);

	    const t0 = Date.now();

    // 回退到文件存储
    let plants = readJSON('plants.json', []);
    plants = plants.filter((x) => x && x.onShelf === true);

    if (Array.isArray(tags) && tags.length > 0) {
      plants = plants.filter((x) => tags.every((t) => (x.tags || []).includes(t)));
    }

    plants.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const total = plants.length;
    const start = (p - 1) * ps;
    const data = plants.slice(start, start + ps);
    res.json({ ok: true, data, total, page: p, pageSize: ps });
  }
});


	    const elapsed = Date.now() - t0;
	    try{
	      usedFallback = true;
	      perfStats.push('listPlants', elapsed, usedFallback);
	      const psnap = perfStats.percentiles('listPlants');
	      const frate = perfStats.fallbackRate('listPlants');
	      console.warn('[listPlants][fallback][perf]', { elapsed, p50: psnap.p50, p95: psnap.p95, count: psnap.count, fallbackRate: frate });
	    }catch(_){ }

// --- 简易百分位计算 ---
function percentile(arr, p){
  if(!Array.isArray(arr) || arr.length===0) return 0;
  const s = arr.slice().sort((a,b)=>a-b);
  const idx = Math.min(s.length-1, Math.floor((p/100)*s.length));
  return s[idx];
}



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

// POST /recommendPlants - 植物推荐（使用数据库）
// req: { answers: Array<{id:string,value:string}>, topN?: number, userProfile?: Object }
// resp: { ok: true, data: Plant[], algorithm?: string }
app.post('/recommendPlants', async (req, res) => {
  const { answers, topN = 10, userProfile = {} } = req.body || {};
  if (!Array.isArray(answers) || answers.length === 0) {
    return badRequest(res, 'answers required');
  }

  const answersMap = toAnswerMap(answers);
  const tStart = Date.now();

  // 构建用户画像（从答案中推断）
  const inferredProfile = {
    hasPets: answersMap['pets'] === 'yes' || answersMap['hasPets'] === 'cats' || answersMap['hasPets'] === 'dogs' || answersMap['hasPets'] === 'both',
    hasChildren: answersMap['children'] === 'yes' || answersMap['livingStatus'] === 'family',
    experienceLevel: answersMap['experienceLevel'] || answersMap['level'] || 'beginner',
    isNewUser: (answersMap['experienceLevel'] || answersMap['level']) === 'beginner',
    ...userProfile
  };

  try {
    const db = dySDK.database();

    // DB侧获取候选（按上架与更新时间排序），尽量减少传输量（初期先取较大页，后续可迭代）
    let plants = [];
    try {
      const result = await db.collection('plants')
        .where({ onShelf: true })
        .orderBy('updatedAt', 'desc')
        .limit(500)
        .get();
      plants = result.data || [];
    } catch(_) {
      plants = [];
    }

    // 安全过滤（基于用户画像）
    if (inferredProfile.hasPets) {
      plants = plants.filter(plant => {
        const plantTags = plant.tags || [];
        return !plantTags.some(tag => ['pet_toxic', 'toxic-to-cats', 'toxic-to-dogs'].includes(tag));
      });
    }

    if (inferredProfile.hasChildren) {
      plants = plants.filter(plant => {
        const plantTags = plant.tags || [];
        return !plantTags.some(tag => ['child_unsafe', 'toxic-if-ingested', 'sharp-spines'].includes(tag));
      });
    }

    const candidateTotal = plants.length;

    // 计算基础推荐分数
    const baseScored = plants.map((plant) => {
      let score = scorePlant(answersMap, plant);

      // 安全降权（软惩罚）
      if (!inferredProfile.hasPets && (plant.tags || []).includes('pet_toxic')) {
        score -= 2;
      }
      if (!inferredProfile.hasChildren && (plant.tags || []).includes('child_unsafe')) {
        score -= 1;
      }

      return { ...plant, score };
    });

    // 去重：根据植物ID去重，保留分数最高的记录
    const uniqueMap = new Map();
    baseScored.forEach(plant => {
      const plantId = plant.id;
      if (!uniqueMap.has(plantId) || uniqueMap.get(plantId).score < plant.score) {
        uniqueMap.set(plantId, plant);
      }
    });

    let ranked = Array.from(uniqueMap.values());

    // 基础排序
    ranked.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    // 可选：A/B 分桶（按 openId/anonymousOpenid 进行一致性哈希）
    let userIdForAb = '';
    try {
      const serviceCtx = dySDK.context({ headers: req.headers });
      const ctx = serviceCtx.getContext();
      userIdForAb = (ctx?.openId || ctx?.anonymousOpenid || '') + '';
    } catch(_){}
    const AB_MODE = (process.env.AB_MODE || '').toLowerCase(); // 'hash' 时启用哈希分桶

    // 可选：贝叶斯不确定性惩罚（MVP 简化版）与 MMR 参数
    const ENABLE_BAYES_UNC_ENV = (process.env.ENABLE_BAYES_UNC || '1') === '1';
    const LAMBDA_UNC = Number(process.env.LAMBDA_UNC || 0.2);
    const ENABLE_MMR_ENV = (process.env.ENABLE_MMR || '1') === '1';
    const MMR_LAMBDA = Number(process.env.MMR_LAMBDA || 0.7);
    const TOP_M_FOR_RERANK = Math.max(10, Number(process.env.TOP_M_FOR_RERANK || 50));

    // 计算分桶并得到实际生效的开关
    const ab = (AB_MODE === 'hash' && userIdForAb) ? abBucket(userIdForAb, 2) : { bucket: 'env', hash: null };
    const ENABLE_BAYES_UNC = (AB_MODE === 'hash' && userIdForAb)
      ? (ab.bucket === 'treatment')
      : ENABLE_BAYES_UNC_ENV;
    const ENABLE_MMR = (AB_MODE === 'hash' && userIdForAb)
      ? (ab.bucket === 'treatment')
      : ENABLE_MMR_ENV;

    if (ENABLE_BAYES_UNC) {
      ranked = ranked.map(p => {
        const tags = p.tags || [];
        const lightMatch = isMatch(answersMap.light, tags, 'light') ? 1 : 0;
        const spaceMatch = isMatch(answersMap.space, tags, 'space') ? 1 : 0;
        const levelMatch = isMatch(answersMap.level, tags, 'level') ? 1 : 0;
        const matched = lightMatch + spaceMatch + levelMatch;
        const uncertainty = 1 - (matched / 3); // 匹配越少，不确定性越高
        const adjusted = p.score - LAMBDA_UNC * uncertainty;
        return { ...p, score: adjusted };
      });

      // 重新排序
      ranked.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
    }

    let finalList;
    let mmrCostMs = 0;
    if (ENABLE_MMR) {
      const t0 = Date.now();
      const topM = ranked.slice(0, Math.min(TOP_M_FOR_RERANK, ranked.length));
      const R = [];
      while (R.length < (Number(topN) > 0 ? Number(topN) : 10) && topM.length > 0) {
        let bestIdx = 0;
        let bestScore = -Infinity;
        for (let i = 0; i < topM.length; i++) {
          const cand = topM[i];
          let maxSim = 0;
          for (const r of R) {
            const s = jaccardSim(cand.tags || [], r.tags || []);
            if (s > maxSim) maxSim = s;
          }
          const mmrScore = MMR_LAMBDA * cand.score - (1 - MMR_LAMBDA) * maxSim;
          if (mmrScore > bestScore) {
            bestScore = mmrScore;
            bestIdx = i;
          }
        }
        R.push(topM[bestIdx]);
        topM.splice(bestIdx, 1);
      }
      finalList = R;
      mmrCostMs = Date.now() - t0;
    } else {
      finalList = ranked.slice(0, Number(topN) > 0 ? Number(topN) : 10);

      // 调试埋点（如需，后续可接入日志收集）
      console.log('[MMR] lambda=%s topM=%s costMs=%s', MMR_LAMBDA, Math.min(TOP_M_FOR_RERANK, ranked.length), mmrCostMs);

    }

    const elapsed = Date.now() - tStart;

	    // 记录性能统计
	    try{
	      perfStats.push('recommendPlants', elapsed, false);
	      const psnap = perfStats.percentiles('recommendPlants');
	      const frate = perfStats.fallbackRate('recommendPlants');
	      console.log('[recommendPlants][perf]', { elapsed, p50: psnap.p50, p95: psnap.p95, count: psnap.count, fallbackRate: frate, mmrCostMs });
	    }catch(_){ }

    const algorithmName = (ENABLE_MMR || ENABLE_BAYES_UNC) ? 'enhanced_bayes_mmr' : 'database';
    const desiredTopN = (Number(topN) > 0 ? Number(topN) : 10);
    const riskFlags = [];
    if (mmrCostMs > 30) riskFlags.push('mmr_slow');
    if (candidateTotal < 10) riskFlags.push('few_candidates');
    if ((finalList || []).length < desiredTopN) riskFlags.push('short_result');
    if (elapsed > 800) riskFlags.push('slow_endpoint');

    res.json({
      ok: true,
      data: finalList,
      algorithm: algorithmName,
      userProfile: inferredProfile,
      debug: {
        ENABLE_BAYES_UNC,
        LAMBDA_UNC,
        ENABLE_MMR,
        MMR_LAMBDA,
        TOP_M_FOR_RERANK,
        mmrCostMs,
        candidateTotal,
        topMUsed: Math.min(TOP_M_FOR_RERANK, ranked.length),
        ab: { mode: AB_MODE, userHashed: !!userIdForAb, userHash: ab?.hash || null, bucket: ab?.bucket || 'env' },
        elapsed,
        perf: { rec: perfStats.percentiles('recommendPlants') },
        fallback: false,
        algorithmName,
        riskFlags
      }
    });

  } catch (error) {
    console.error('[recommendPlants] database error:', error);

    // 回退到文件存储
    let plants = readJSON('plants.json', []);
    plants = plants.filter((x) => x && x.onShelf === true);

    const scored = legacyRecommendPlants(answersMap, plants, inferredProfile, topN);

    const elapsed = Date.now() - tStart;
    res.json({
      ok: true,
      data: scored,
      algorithm: 'legacy_fallback',
      userProfile: inferredProfile,
      debug: { fallback: true, elapsed }
    });
  }
});

// 增强版推荐算法（简化版，内联实现）
function enhancedRecommendPlants(answers, plants, userProfile, topN) {
  const answersMap = toAnswerMap(answers);

  // 安全过滤
  plants = plants.filter(plant => {
    const safetyFlags = plant.safetyFlags || [];

    if (userProfile.hasPets && safetyFlags.includes('pet_unsafe')) {
      return false;
    }

    if (userProfile.hasChildren && safetyFlags.includes('child_unsafe')) {
      return false;
    }

    return true;
  });

  // 增强版评分
  const scored = plants.map(plant => {
    let score = calculateEnhancedScore(answersMap, plant, userProfile);
    return { ...plant, score };
  });

  // 排序
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  return scored.slice(0, Number(topN) > 0 ? Number(topN) : 10);
}

// 原始推荐算法（向后兼容）
function legacyRecommendPlants(answersMap, plants, userProfile, topN) {
  // 安全过滤
  const hasPets = userProfile.hasPets;
  const hasChildren = userProfile.hasChildren;
  const isUnsafeForPets = (p) => Array.isArray(p.safetyFlags) && p.safetyFlags.includes('pet_unsafe');
  const isUnsafeForChildren = (p) => Array.isArray(p.safetyFlags) && (p.safetyFlags.includes('child_unsafe') || p.safetyFlags.includes('latex_sap_irritant'));

  plants = plants.filter((p) => {
    if (hasPets && isUnsafeForPets(p)) return false;
    if (hasChildren && isUnsafeForChildren(p)) return false;
    return true;
  });

  // 评分和排序
  const scored = plants.map((p) => {
    let s = scorePlant(answersMap, p);
    if (!hasPets && isUnsafeForPets(p)) s -= 2;
    if (!hasChildren && isUnsafeForChildren(p)) s -= 1;
    return { ...p, score: s };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  return scored.slice(0, Number(topN) > 0 ? Number(topN) : 10);
}

// 增强版评分算法
function calculateEnhancedScore(answersMap, plant, userProfile) {
  const plantTags = plant.tags || [];

  // 动态权重调整
  let weights = {
    environment: 0.4,
    aesthetic: 0.3,
    care: 0.2,
    safety: 0.1
  };

  if (userProfile.isNewUser) {
    weights.environment = 0.6;
    weights.aesthetic = 0.2;
    weights.care = 0.15;
    weights.safety = 0.05;
  }

  if (userProfile.hasPets) {
    weights.safety = 0.3;
    weights.environment = 0.35;
    weights.aesthetic = 0.2;
    weights.care = 0.15;
  }

  let totalScore = 0;
  const baseScore = 10;

  // 环境适配度评分
  let envScore = 0;
  if (isMatch(answersMap.lightCondition || answersMap.light, plantTags, 'light')) {
    envScore += baseScore * 0.5;
  }
  if (isMatch(answersMap.spaceType || answersMap.space, plantTags, 'space')) {
    envScore += baseScore * 0.3;
  }
  totalScore += envScore * weights.environment;

  // 养护能力评分
  let careScore = 0;
  if (isMatch(answersMap.experienceLevel || answersMap.level, plantTags, 'level')) {
    careScore += baseScore * 0.7;
  }
  if (answersMap.timeCommitment && isMatchTimeCommitment(answersMap.timeCommitment, plantTags)) {
    careScore += baseScore * 0.3;
  }
  totalScore += careScore * weights.care;

  // 安全因素评分

// 一致性哈希分桶（简单实现）：返回 { bucket: 'control'|'treatment', hash }
function abBucket(userId, buckets = 2) {
  try {
    const str = String(userId || '');
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    const mod = h % buckets;
    return { bucket: mod === 0 ? 'control' : 'treatment', hash: h };
  } catch (_) {
    return { bucket: 'control', hash: null };
  }
}

  let safetyScore = baseScore;
  const safetyFlags = plant.safetyFlags || [];
  if (userProfile.hasPets && safetyFlags.includes('pet_unsafe')) {
    safetyScore = 0;
  }
  if (userProfile.hasChildren && safetyFlags.includes('child_unsafe')) {
    safetyScore = 0;
  }
  totalScore += safetyScore * weights.safety;

  return Math.round(totalScore * 100) / 100;
}

// 时间投入匹配
function isMatchTimeCommitment(timeCommitment, plantTags) {
  const timeTagMapping = {
    'minimal': ['ultra-low-maintenance', 'drought-tolerant', 'neglect-tolerant'],
    'light': ['low-maintenance', 'weekly-care', 'easy-care'],
    'moderate': ['moderate-care', 'regular-attention'],
    'intensive': ['high-maintenance', 'daily-care', 'detailed-care']
  };

  const expectedTags = timeTagMapping[timeCommitment] || [];
  return expectedTags.some(tag => plantTags.includes(tag));
}

// 简单的标签相似度（Jaccard）- 全局可用
function jaccardSim(a = [], b = []) {
  try {
    const sa = new Set(Array.isArray(a) ? a : []);
    const sb = new Set(Array.isArray(b) ? b : []);
    let inter = 0;
    sa.forEach((x) => { if (sb.has(x)) inter++; });
    const union = sa.size + sb.size - inter;
    return union > 0 ? inter / union : 0;
  } catch (_) {
    return 0;
  }
}


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

// POST /importData - 数据导入接口
// req: { type?: 'plants' | 'questions' | 'all' }
// resp: { ok: true, results: Object }
app.post('/importData', async (req, res) => {
  const { type = 'all' } = req.body || {};

  try {
    console.log('🚀 开始数据导入流程...');

    const results = {
      plants: null,
      questionConfig: null,
      timestamp: new Date().toISOString()
    };

    // 导入植物数据
    if (type === 'all' || type === 'plants') {
      try {
        results.plants = await importPlantsToDatabase();
      } catch (error) {
        results.plants = { error: error.message };
      }
    }

    // 导入题库配置
    if (type === 'all' || type === 'questions') {
      try {
        results.questionConfig = await importQuestionConfigToDatabase();
      } catch (error) {
        results.questionConfig = { error: error.message };
      }
    }

    console.log('📈 数据导入完成:', results);

    res.json({
      ok: true,
      message: '数据导入完成',
      results: results
    });

  } catch (error) {
    console.error('数据导入失败:', error);

    res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 植物数据导入函数
async function importPlantsToDatabase() {
  try {
    console.log('🌱 开始导入植物数据...');

    // 读取植物数据
    const plantsData = readJSON('enhanced_plants.json', []);
    console.log(`📊 共找到 ${plantsData.length} 个植物数据`);

    const db = dySDK.database();
    const plantsCollection = db.collection('plants');

    // 检查现有数据
    console.log('🔍 检查现有植物数据...');
    let existingCount = 0;
    try {
      const existingPlants = await plantsCollection.where({}).get();
      existingCount = existingPlants.data.length;
      console.log(`现有植物数量: ${existingCount}`);
    } catch (error) {
      console.log('集合可能不存在，将创建新集合');
    }

    // 导入植物数据
    let successCount = 0;
    let errorCount = 0;

    for (const plant of plantsData) {
      try {
        // 转换数据格式
        const plantDoc = {
          id: plant.id,
          name: plant.name,
          scientific_name: plant.scientific_name,
          common_names: plant.common_names,
          characteristics: plant.characteristics,
          environment: plant.environment,
          care: plant.care,
          toxicity: plant.toxicity,
          questionnaire_tags: plant.questionnaire_tags,
          tags: plant.tags,
          safetyFlags: plant.safetyFlags,
          onShelf: plant.onShelf,
          cover: plant.cover,
          updatedAt: plant.updatedAt || Date.now(),
          score: plant.score || 0,
          createdAt: Date.now()
        };

        await plantsCollection.add(plantDoc);
        successCount++;
        console.log(`✅ 导入植物: ${plant.name} (${plant.id})`);

      } catch (error) {
        errorCount++;
        console.log(`❌ 导入失败: ${plant.name} - ${error.message}`);
      }
    }

    console.log(`📊 植物数据导入完成: 成功 ${successCount}, 失败 ${errorCount}`);
    return {
      success: successCount,
      error: errorCount,
      total: plantsData.length,
      existingCount: existingCount
    };

  } catch (error) {
    console.error('植物数据导入失败:', error);
    throw error;
  }
}

// 题库配置导入函数
async function importQuestionConfigToDatabase() {
  try {
    console.log('📝 开始导入题库配置...');

    // 读取题库配置
    const configData = readJSON('question_config.json', {});
    console.log('📊 题库配置数据:', Object.keys(configData));

    const db = dySDK.database();
    const configCollection = db.collection('question_config');

    // 导入配置数据
    const configDoc = {
      type: 'dynamic_questionnaire',
      version: configData.version || '1.0',
      config: configData,
      questionBank: configData.questionBank,
      questions: configData.questions,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      active: true
    };

    await configCollection.add(configDoc);
    console.log('✅ 题库配置导入成功');

    return { success: true, version: configDoc.version };

  } catch (error) {
    console.error('题库配置导入失败:', error);
    throw error;
  }

}

// 扁平化增强题库为数组
function flattenEnhancedQuestionBank(configObj){
  try{
    const qb = (configObj && configObj.questionBank) || {};
    const sections = Object.values(qb).filter(x=>x && Array.isArray(x.questions));
    const arr = [];
    sections.forEach(sec=>{
      sec.questions.forEach(q=>{ if(q && q.id){ arr.push(q); } });
    });
    return arr;
  }catch(_){ return []; }
}

// 管理端：导入增强题库（enhanced_question_bank.json）到数据库（提供多路径别名，便于接口调试）
async function importEnhancedQuestionBankHandler(req, res){
  try{
    const enhanced = readJSON('enhanced_question_bank.json', null);
    if(!enhanced){ return badRequest(res, 'enhanced_question_bank.json not found'); }
    const questionsFlat = flattenEnhancedQuestionBank(enhanced);
    if(!Array.isArray(questionsFlat) || questionsFlat.length===0){
      return badRequest(res, 'no questions parsed from enhanced_question_bank.json');
    }
    const db = dySDK.database();
    const coll = db.collection('question_config');
    const doc = {
      type: 'dynamic_questionnaire',
      version: enhanced.version || 'v2.1',
      active: true,
      // 为GET /getQuestionConfig 的兼容：直接提供数组以触发 supportsDynamicQuestionnaire
      questionBank: questionsFlat,
      // 兼容保留原始结构
      config: enhanced,
      updatedAt: Date.now(),
      createdAt: Date.now()
    };
    await coll.add(doc);
    res.json({ ok:true, message:'imported', count: questionsFlat.length, version: doc.version });
  }catch(e){
    console.error('[admin/importEnhancedQuestionBank] error:', e);
    res.status(500).json({ ok:false, message: e?.message || 'import failed' });
  }
}
app.post('/admin/importEnhancedQuestionBank', importEnhancedQuestionBankHandler);
app.post('/admin/import-enhanced-question-bank', importEnhancedQuestionBankHandler);
app.post('/importEnhancedQuestionBank', importEnhancedQuestionBankHandler);
app.get('/admin/importEnhancedQuestionBank', importEnhancedQuestionBankHandler);

const port = process.env.PORT || 8000;
// 获取植物详情接口
app.post('/getPlantDetail', (req, res) => {
  const { plantId } = req.body;

  if (!plantId) {
    return res.status(400).json({ ok: false, message: '缺少植物ID' });
  }

  try {
    // 从植物知识库读取详细信息
    const knowledgeDb = readJSON('plant_knowledge_database.json', { plants: [] });
    const plantDetail = knowledgeDb.plants.find(p => p.id === plantId);

    if (!plantDetail) {
      return res.json({ ok: false, message: '未找到植物详情' });
    }

    res.json({ ok: true, data: plantDetail });
  } catch (error) {
    console.error('[getPlantDetail] error:', error);
    res.status(500).json({ ok: false, message: '服务器错误' });
  }
});

app.listen(port, () => {
  console.log(`[zhidao-api] listening on ${port}`);
});
