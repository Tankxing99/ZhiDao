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

// health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// GET /getQuestionConfig - 问卷配置（使用数据库）
// query: { phase?: string, userProfile?: string }
// resp: { ok: true, version: string, questionBank?: Object, questions?: Array }
app.get('/getQuestionConfig', async (req, res) => {
  const { phase, userProfile } = req.query;

  try {
    const db = dySDK.database();

    // 尝试从数据库获取动态题库配置
    const result = await db.collection('question_config')
      .where({ type: 'dynamic_questionnaire' })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    if (result.data && result.data.length > 0) {
      const config = result.data[0];
      // 动态问卷配置可能存储在 config.questions 或 questions 字段中
      const questionBank = config.questionBank || config.config?.questions || config.questions;
      res.json({
        ok: true,
        version: config.version || 'v2.1',
        questionBank: questionBank,
        supportsDynamicQuestionnaire: true
      });
      return;
    }

    // 回退到传统问卷配置
    const fallbackResult = await db.collection('question_config')
      .where({ type: { $ne: 'dynamic_questionnaire' } })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    if (fallbackResult.data && fallbackResult.data.length > 0) {
      const config = fallbackResult.data[0];
      res.json({
        ok: true,
        version: config.version || 'v1.0',
        questions: config.questions || [],
        supportsDynamicQuestionnaire: false
      });
      return;
    }

    // 最终回退到文件
    const cfg = readJSON('question_config.json', { version: 'v0', questions: [] });
    res.json({
      ok: true,
      version: cfg.version,
      questions: cfg.questions,
      supportsDynamicQuestionnaire: false
    });

  } catch (error) {
    console.error('[getQuestionConfig] database error:', error);
    // 回退到文件存储
    const cfg = readJSON('question_config.json', { version: 'v0', questions: [] });
    res.json({
      ok: true,
      version: cfg.version,
      questions: cfg.questions,
      supportsDynamicQuestionnaire: false
    });
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
  const { phase, userProfile } = req.body || {};

  try {
    const db = dySDK.database();

    // 尝试从数据库获取动态题库配置
    const result = await db.collection('question_config')
      .where({ type: 'dynamic_questionnaire' })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    if (result.data && result.data.length > 0) {
      const config = result.data[0];
      // 动态问卷配置可能存储在 config.questions 或 questions 字段中
      const questionBank = config.questionBank || config.config?.questions || config.questions;
      res.json({
        ok: true,
        version: config.version || 'v2.1',
        questionBank: questionBank,
        supportsDynamicQuestionnaire: true
      });
      return;
    }

    // 回退到传统问卷配置
    const fallbackResult = await db.collection('question_config')
      .where({ type: { $ne: 'dynamic_questionnaire' } })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    if (fallbackResult.data && fallbackResult.data.length > 0) {
      const config = fallbackResult.data[0];
      res.json({
        ok: true,
        version: config.version || 'v1.0',
        questions: config.questions || [],
        supportsDynamicQuestionnaire: false
      });
      return;
    }

    // 最终回退到文件
    const cfg = readJSON('question_config.json', { version: 'v0', questions: [] });
    res.json({
      ok: true,
      version: cfg.version,
      questions: cfg.questions,
      supportsDynamicQuestionnaire: false
    });

  } catch (error) {
    console.error('[getQuestionConfig] database error:', error);
    // 回退到文件存储
    const cfg = readJSON('question_config.json', { version: 'v0', questions: [] });
    res.json({
      ok: true,
      version: cfg.version,
      questions: cfg.questions,
      supportsDynamicQuestionnaire: false
    });
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

    // 简化查询，先获取所有上架植物，然后在内存中过滤
    const result = await db.collection('plants')
      .where({ onShelf: true })
      .orderBy('updatedAt', 'desc')
      .get();

    let plants = result.data || [];

    // 安全过滤（基于用户画像）
    if (userProfile.hasPets) {
      // 排除对宠物有毒的植物
      plants = plants.filter(plant => {
        const plantTags = plant.tags || [];
        return !plantTags.some(tag => ['pet_toxic', 'toxic-to-cats', 'toxic-to-dogs'].includes(tag));
      });
    }

    if (userProfile.hasChildren) {
      // 排除对儿童不安全的植物
      plants = plants.filter(plant => {
        const plantTags = plant.tags || [];
        return !plantTags.some(tag => ['child_unsafe', 'toxic-if-ingested', 'sharp-spines'].includes(tag));
      });
    }

    // filter by tags (all included)
    if (Array.isArray(tags) && tags.length > 0) {
      plants = plants.filter(plant => {
        const plantTags = plant.tags || [];
        return tags.every(tag => plantTags.includes(tag));
      });
    }

    // 分页处理
    const total = plants.length;
    const start = (p - 1) * ps;
    const data = plants.slice(start, start + ps);

    res.json({ ok: true, data, total, page: p, pageSize: ps });

  } catch (error) {
    console.error('[listPlants] database error:', error);
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

    // 简化查询，获取所有上架植物，然后在内存中过滤
    const result = await db.collection('plants')
      .where({ onShelf: true })
      .get();

    let plants = result.data || [];

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

    // 计算推荐分数
    const scored = plants.map((plant) => {
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

    // 排序并返回TopN
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    // 去重：根据植物ID去重，保留分数最高的记录
    const uniquePlants = new Map();
    scored.forEach(plant => {
      const plantId = plant.id;
      if (!uniquePlants.has(plantId) || uniquePlants.get(plantId).score < plant.score) {
        uniquePlants.set(plantId, plant);
      }
    });

    // 转换为数组并重新排序
    const deduplicatedPlants = Array.from(uniquePlants.values());
    deduplicatedPlants.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    const data = deduplicatedPlants.slice(0, Number(topN) > 0 ? Number(topN) : 10);

    res.json({
      ok: true,
      data,
      algorithm: 'database',
      userProfile: inferredProfile
    });

  } catch (error) {
    console.error('[recommendPlants] database error:', error);

    // 回退到文件存储
    let plants = readJSON('plants.json', []);
    plants = plants.filter((x) => x && x.onShelf === true);

    const scored = legacyRecommendPlants(answersMap, plants, inferredProfile, topN);

    res.json({
      ok: true,
      data: scored,
      algorithm: 'legacy_fallback',
      userProfile: inferredProfile
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

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`[zhidao-api] listening on ${port}`);
});
