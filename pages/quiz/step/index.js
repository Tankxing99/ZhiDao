const { parseJson, toastError } = require('../../../utils/index');
const { logEvent } = require('../../../utils/analytics');

Page({
  data: {
    idx: 0,
    total: 0,
    question: null,
    selected: '',
    selectedMulti: [],
    loading: true,
    // 动态问卷相关
    supportsDynamicQuestionnaire: false,
    currentPhase: '',
    phaseTitle: '',
    phaseDescription: '',
    overallProgress: { current: 0, total: 0, percentage: 0 },
    questionIndex: 0,
    totalInPhase: 0,
    userProfile: {},

	  onShow(){
	    try{
	      // 进入页面或返回页面时，重新记录step开始时间
	      this._stepStartTs = Date.now();
	    }catch(_){ }
	  },

    dynamicQuestionnaire: null,
  onReady(){
    try{ this._questionStartTs = Date.now(); this._stepStartTs = Date.now(); logEvent('start_question', { mode: 'adaptive' }); }catch(_){ }
  },

  },
  async onLoad(options){
    const idx = Number(options?.idx || 0);
    this.setData({ idx });

    // 清除缓存以确保获取最新配置（调试用）
    tt.removeStorageSync('question_config_cache');

    await this.ensureConfigLoaded();
    this.applyQuestion();
  },
  onShow(){
    // 恢复已选答案
    try{
      const answers = tt.getStorageSync('quiz_answers') || {};
      const q = this.data.question;
      if(q && answers[q.id]){
        const val = answers[q.id];
        if (Array.isArray(val)) {
          this.setData({ selected: '', selectedMulti: val });
        } else {
          this.setData({ selected: val, selectedMulti: [] });
        }
      }
    }catch(_){/* ignore */}
  },
  async ensureConfigLoaded(){
    // 本地缓存优先
    let cfg = tt.getStorageSync('question_config_cache');
    if(!cfg || !cfg.version || (!Array.isArray(cfg.questions) && !Array.isArray(cfg.questionBank))){
      try{
        const app = getApp();
        let cloud = app.globalData && app.globalData.cloud;
        // 兜底：若 cloud 未就绪，按配置即时创建
        if(!cloud){
          const { getConfig } = require('../../../config/config');
          const { envID, serviceID } = getConfig();
          cloud = tt.createCloud({ envID, serviceID });
          if(app.globalData){ app.globalData.cloud = cloud; }
        }

        // 统一 Promise 封装，避免 SDK 版本差异导致 await 不生效
        const callP = (path, init)=> new Promise((resolve, reject)=>{
          try{
            cloud.callContainer({
              path, init,
              success: ({ statusCode, data, header }) => resolve({ statusCode, data, header }),
              fail: (err) => reject(err),
            });
          }catch(err){ reject(err); }
        });

        // 先 GET，再失败时尝试 POST
        let r1;
        try{
          r1 = await callP('/getQuestionConfig', { method:'GET', header:{ 'content-type':'application/json' }, timeout:30000 });
        }catch(err){ r1 = { statusCode: -1, data: null, err }; }

        let statusCode = r1.statusCode;
        let data = r1.data;
        if(statusCode !== 200){
          try{
            const r2 = await callP('/getQuestionConfig', { method:'POST', header:{ 'content-type':'application/json' }, timeout:30000 });
            statusCode = r2.statusCode; data = r2.data;
          }catch(err2){
            console.warn('[getQuestionConfig] POST probe fail:', err2?.errMsg || err2);
          }
        }

        console.log('[getQuestionConfig] status=', statusCode, 'raw=', typeof data, String(data).slice(0,180));
        const resp = parseJson(data) || {};
        const ok = (resp && resp.ok === true) || statusCode === 200;
        if(ok){
          const version = resp.version || (resp.data && resp.data.version) || 'v0';

          // 检查是否支持动态问卷
          if (resp.supportsDynamicQuestionnaire && resp.questionBank) {
            // 使用动态问卷系统
            cfg = {
              version,
              questionBank: resp.questionBank,
              supportsDynamicQuestionnaire: true

            };
            this.setData({ supportsDynamicQuestionnaire: true });
            this.initDynamicQuestionnaire(resp.questionBank);
          } else {
            // 使用传统问卷
            const questions = resp.questions || (resp.data && resp.data.questions) || [];
            cfg = { version, questions, supportsDynamicQuestionnaire: false };
            try{ logEvent('adaptive_degrade', { reason: 'no_dynamic_support' }); }catch(_){}

          }

          tt.setStorageSync('question_config_cache', cfg);
        } else {
          throw new Error((resp && (resp.message||resp.error)) || `HTTP ${statusCode}`);
        }
      } catch(e){
        console.error('[ensureConfigLoaded] error:', e);
        tt.showModal({ title:'获取题目失败', content: (e && (e.errMsg||e.message)) || '未知错误', showCancel:false });
        cfg = { version:'v0', questions: [] };
      }
    }
    this._cfg = cfg;
  },

  // 初始化动态问卷系统
  initDynamicQuestionnaire(questionBank) {
    console.log('[initDynamicQuestionnaire] 初始化动态问卷系统');
    console.log('[initDynamicQuestionnaire] questionBank类型:', typeof questionBank, Array.isArray(questionBank));

    // 处理不同的questionBank格式，实现真正的动态问卷
    let processedQuestionBank;
    let totalQuestions = 0;

    if (Array.isArray(questionBank)) {
      // 如果是数组格式，实现智能动态问卷逻辑
      console.log('[initDynamicQuestionnaire] 检测到数组格式，实现动态问卷逻辑');

      // 将题目按类型分类，实现动态选择
      const allQuestions = questionBank;
      processedQuestionBank = {
        // 基础问题阶段（必问）
        basic: {
          name: '基础信息',
          questions: allQuestions.filter(q => ['light', 'space', 'level'].includes(q.id))
        },
        // 安全问题阶段（条件触发）
        safety: {
          name: '安全考虑',
          questions: allQuestions.filter(q => ['pets', 'children'].includes(q.id))
        },
        // 偏好问题阶段（包含多选题）
        preferences: {
          name: '偏好选择',
          questions: allQuestions.filter(q => q && q.type === 'multiple')
        }
      };

      // 预估总问题数（基础+安全+偏好），偏好阶段数量做上限约束（MVP: 最多显示2道）
      const prefCount = Math.min(processedQuestionBank.preferences.questions.length, 2);
      totalQuestions = processedQuestionBank.basic.questions.length + processedQuestionBank.safety.questions.length + prefCount;

    } else if (questionBank && typeof questionBank === 'object') {
      // 如果是对象格式，按原逻辑处理
      console.log('[initDynamicQuestionnaire] 检测到对象格式，使用原逻辑');
      processedQuestionBank = questionBank;
      Object.values(questionBank).forEach(phase => {
        if (phase.questions) {
          totalQuestions += phase.questions.length;
        }
      });
    } else {
      console.error('[initDynamicQuestionnaire] 无效的questionBank格式:', questionBank);
      processedQuestionBank = {};
    }

    // 简化版动态问卷管理器（内联实现）
    this.dynamicQuestionnaire = {
      questionBank: processedQuestionBank,
      userProfile: {},
      answers: [],
      currentPhase: 'basic',
      currentQuestionIndex: 0,
      phaseOrder: ['basic', 'safety', 'preferences'], // 简化的阶段顺序，包含偏好阶段（多选）
      totalQuestions: totalQuestions,
      completedPhases: new Set(), // 记录已完成的阶段
      dynamicLogic: true, // 标记启用动态逻辑
      mode: 'adaptive', // fast/adaptive/precision（预留）
      extraCount: 0,
      maxExtra: 3,
      stabilityThresholds: { top1: 0.90, topN: 0.95 }
    };

    console.log('[initDynamicQuestionnaire] 总问题数:', totalQuestions);
    console.log('[initDynamicQuestionnaire] 处理后的questionBank:', processedQuestionBank);

    // 恢复之前的答案
    try {
      const savedAnswers = tt.getStorageSync('quiz_answers') || {};
      if (savedAnswers.dynamicAnswers) {
        this.dynamicQuestionnaire.answers = savedAnswers.dynamicAnswers;
        this.rebuildUserProfile();
        console.log('[initDynamicQuestionnaire] 恢复答案:', savedAnswers.dynamicAnswers.length);
      }
    } catch (_) { /* ignore */ }
  },

  // 重建用户画像
  rebuildUserProfile() {
    const dq = this.dynamicQuestionnaire;
    dq.userProfile = {};

    dq.answers.forEach(answer => {
      const question = this.findQuestion(answer.id);
      if (question && question.options) {
        const selectedOption = question.options.find(opt => opt.value === answer.value);
        if (selectedOption && selectedOption.tags) {
          selectedOption.tags.forEach(tag => {
            dq.userProfile[tag] = true;
          });
        }
      }

      // 特殊字段处理
      if (answer.id === 'experienceLevel') {
        dq.userProfile.experienceLevel = answer.value;
        dq.userProfile.isNewUser = (answer.value === 'beginner');
      } else if (answer.id === 'hasPets') {
        dq.userProfile.hasPets = (answer.value !== 'none');
      }
    });
  },

  // 处理动态问卷答案
  processDynamicAnswer(questionId, answer) {
    const dq = this.dynamicQuestionnaire;
    if (!dq) return;

    // 更新或添加答案
    const existingIndex = dq.answers.findIndex(a => a.id === questionId);
    if (existingIndex >= 0) {
      dq.answers[existingIndex].value = answer;
    } else {
      dq.answers.push({ id: questionId, value: answer });
    }

    // 重新构建用户画像
    this.rebuildUserProfile();
  },

  // 查找问题
  findQuestion(questionId) {
    const dq = this.dynamicQuestionnaire;
    if (!dq || !dq.questionBank) return null;

    for (const phase of Object.values(dq.questionBank)) {
      if (phase.questions) {
        const question = phase.questions.find(q => q.id === questionId);
        if (question) return question;
      }
    }
    return null;
  },

  // 获取下一个问题
  getNextDynamicQuestion() {
    const dq = this.dynamicQuestionnaire;
    if (!dq) {
      console.log('[getNextDynamicQuestion] 动态问卷未初始化');
      return null;
    }

    console.log('[getNextDynamicQuestion] 当前阶段:', dq.currentPhase, '问题索引:', dq.currentQuestionIndex);
    console.log('[getNextDynamicQuestion] 用户画像:', dq.userProfile);

    // 计算稳定度（启发式MVP）
    try { dq.stability = this.estimateStability(); } catch(_) {}

    const currentPhaseConfig = dq.questionBank[dq.currentPhase];
    if (!currentPhaseConfig) {
      console.log('[getNextDynamicQuestion] 阶段配置不存在:', dq.currentPhase);
      return null;
    }

    // 检查当前阶段是否还有问题
    while (dq.currentQuestionIndex < currentPhaseConfig.questions.length) {
      const question = currentPhaseConfig.questions[dq.currentQuestionIndex];

      // 检查问题级别的触发条件
      if (this.shouldTriggerQuestion(question)) {
        console.log('[getNextDynamicQuestion] 返回问题:', question.id);

        return {
          ...question,
          phase: dq.currentPhase,
          phaseTitle: currentPhaseConfig.name,
          phaseDescription: currentPhaseConfig.description,
          questionIndex: dq.currentQuestionIndex,
          totalInPhase: currentPhaseConfig.questions.length,
          overallProgress: this.calculateOverallProgress()
        };
      } else {
        console.log('[getNextDynamicQuestion] 跳过问题:', question.id, '不满足触发条件');
        dq.currentQuestionIndex++;
      }
    }

    // 当前阶段完成，切换到下一阶段
    console.log('[getNextDynamicQuestion] 当前阶段完成，切换到下一阶段');
    this.moveToNextPhase();
    return this.getNextDynamicQuestion();
  },

  // 是否存在待触发且未作答的安全问题（pets/children）
  hasPendingSafetyQuestions(){
    const dq = this.dynamicQuestionnaire;
    if(!dq || !dq.questionBank || !dq.questionBank.safety || !Array.isArray(dq.questionBank.safety.questions)) return false;
    for(const q of dq.questionBank.safety.questions){
      const answered = dq.answers.some(a=>a.id===q.id);
      if(!answered && this.shouldTriggerQuestion(q)){
        return true;
      }
    }
    return false;
  },

  // 判断是否应该触发某个问题
  shouldTriggerQuestion(question) {
    const dq = this.dynamicQuestionnaire;

    // 如果没有启用动态逻辑，所有问题都触发
    if (!dq.dynamicLogic) return true;

    // 基础问题（light, space, level）总是触发
    if (['light', 'space', 'level'].includes(question.id)) {
      console.log('[shouldTriggerQuestion]', question.id, '基础问题，总是触发');
      return true;
    }

    // 偏好阶段的多选题：默认触发
    if (question.type === 'multiple') {
      console.log('[shouldTriggerQuestion]', question.id, '偏好多选题，默认触发');
      return true;
    }

    // 安全问题的动态触发逻辑
    if (question.id === 'pets') {
      // 如果用户是新手或选择了小空间，询问宠物情况
      const isNewbie = dq.answers.some(a => a.id === 'level' && a.value === 'beginner');
      const isSmallSpace = dq.answers.some(a => a.id === 'space' && a.value === 'small');
      const shouldTrigger = isNewbie || isSmallSpace;
      console.log('[shouldTriggerQuestion]', question.id, '新手或小空间触发:', shouldTrigger);
      return shouldTrigger;
    }

    if (question.id === 'children') {
      // 如果用户是新手，询问儿童情况
      const isNewbie = dq.answers.some(a => a.id === 'level' && a.value === 'beginner');
      console.log('[shouldTriggerQuestion]', question.id, '新手触发:', isNewbie);
      return isNewbie;
    }

    // 默认不触发未知问题
    console.log('[shouldTriggerQuestion]', question.id, '未知问题，不触发');
    return false;
  },

  // 移动到下一阶段
  moveToNextPhase() {
    const dq = this.dynamicQuestionnaire;
    const currentIndex = dq.phaseOrder.indexOf(dq.currentPhase);

    console.log('[moveToNextPhase] 当前阶段:', dq.currentPhase, '索引:', currentIndex);
    dq.completedPhases.add(dq.currentPhase);

    // 简化的阶段切换逻辑
    if (currentIndex < dq.phaseOrder.length - 1) {
      const nextPhase = dq.phaseOrder[currentIndex + 1];
      dq.currentPhase = nextPhase;
      dq.currentQuestionIndex = 0;
      console.log('[moveToNextPhase] 切换到下一阶段:', nextPhase);
    } else {
      // 没有更多阶段，问卷结束
      dq.currentPhase = 'completed';
      console.log('[moveToNextPhase] 问卷完成');
    }
  },

  // 计算整体进度
  calculateOverallProgress() {
    const dq = this.dynamicQuestionnaire;
    let totalQuestions = 0;
    let answeredQuestions = dq.answers.length;

    // 简化的进度计算：使用预估的总问题数
    if (dq.dynamicLogic) {
      // 动态问卷：基础3题 + 可能的安全题
      totalQuestions = dq.totalQuestions;
    } else {
      // 传统问卷：计算所有阶段的问题数
      dq.phaseOrder.forEach(phase => {
        const phaseConfig = dq.questionBank[phase];
        if (phaseConfig && phaseConfig.questions) {
          totalQuestions += phaseConfig.questions.length;
        }
      });
    }

    return {
      current: answeredQuestions,
      total: totalQuestions,
      percentage: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
    };
  },

  // 稳定度估计（MVP启发式，常数近似，保留接口）
  estimateStability(){
    const t0 = Date.now();
    const dq = this.dynamicQuestionnaire;
    const ans = dq && dq.answers ? dq.answers : [];
    // 简单启发式：回答越多，稳定度越高（仅作占位，后续替换为MC采样）
    const count = ans.length;
    const top1 = Math.min(0.6 + 0.1 * count, 0.95);
    const topN = Math.min(0.7 + 0.1 * count, 0.98);
    const dur = Date.now() - t0;
    // 超时降级埋点（占位）
    if (dur > 80) { try { logEvent('adaptive_degrade', { reason: 'est_stability_slow', dur }); } catch(_){} }
    return { top1, topN };
  },

  applyQuestion(){
    console.log('[applyQuestion] 开始应用问题');
    console.log('[applyQuestion] 支持动态问卷:', this.data.supportsDynamicQuestionnaire);
    console.log('[applyQuestion] 动态问卷实例:', !!this.dynamicQuestionnaire);

    if (this.data.supportsDynamicQuestionnaire && this.dynamicQuestionnaire) {
      // 使用动态问卷
      console.log('[applyQuestion] 使用动态问卷模式');
      this._stepStartTs = Date.now();
      const questionData = this.getNextDynamicQuestion();
      if (questionData) {
        console.log('[applyQuestion] 设置问题数据:', questionData.id);
        this.setData({
          question: questionData,
          currentPhase: questionData.phase,
          phaseTitle: questionData.phaseTitle,
          phaseDescription: questionData.phaseDescription,
          questionIndex: questionData.questionIndex,
          totalInPhase: questionData.totalInPhase,
          overallProgress: questionData.overallProgress,
          loading: false
        });
      } else {
        // 问卷完成
        console.log('[applyQuestion] 动态问卷完成');
        this.setData({ loading: false });
        this.completeDynamicQuestionnaire();
        return;
      }
    } else {
      // 使用传统问卷
      console.log('[applyQuestion] 使用传统问卷模式');
      const qs = (this._cfg && this._cfg.questions) || [];
      const total = qs.length;
      const idx = this.data.idx;
      const q = qs[idx] || null;
      console.log('[applyQuestion] 传统问卷问题:', q?.id, '索引:', idx, '总数:', total);
      this.setData({ total, question: q, loading: false });
    }

    // 恢复选择
    try{
      const answers = tt.getStorageSync('quiz_answers') || {};
      const q = this.data.question;
      if(q && answers[q.id]){
        const val = answers[q.id];
        if (Array.isArray(val)) {
          this.setData({ selected: '', selectedMulti: val });
          console.log('[applyQuestion] 恢复多选:', val);
        } else {
          this.setData({ selected: val, selectedMulti: [] });
          console.log('[applyQuestion] 恢复单选:', val);
        }
      } else {
        this.setData({ selected: '', selectedMulti: [] });
      }
    }catch(_){/* ignore */}
  },

  // 完成动态问卷
  completeDynamicQuestionnaire() {
    const dq = this.dynamicQuestionnaire;
    if (!dq) return;

    // 保存最终答案
    try {
      tt.setStorageSync('quiz_answers', {
        dynamicAnswers: dq.answers,
        userProfile: dq.userProfile,
        timestamp: Date.now()
      });
    } catch (_) { /* ignore */ }

    // 跳转到提交页面
    try{ logEvent('adaptive_finish', { qcount: dq.answers.length, extra: dq.extraCount||0 }); }catch(_){ }
    this.submitDynamicAnswers();
  },

  // 提交动态问卷答案
  async submitDynamicAnswers() {
    const dq = this.dynamicQuestionnaire;
    if (!dq) return;

    try {
      const app = getApp();
      let cloud = app.globalData && app.globalData.cloud;

      if (!cloud) {
        const { getConfig } = require('../../../config/config');
        const { envID, serviceID } = getConfig();
        cloud = tt.createCloud({ envID, serviceID });
        if (app.globalData) { app.globalData.cloud = cloud; }
      }

      // 提交答案
      const submitResult = await this.callContainerPromise(cloud, '/submitAnswers', {
        method: 'POST',
        header: { 'content-type': 'application/json' },
        timeout: 30000
      }, {
        answers: dq.answers,
        userProfile: dq.userProfile,
        clientTs: Date.now()
      });

      console.log('[submitDynamicAnswers] success:', submitResult.statusCode);

      // 获取推荐
      const recommendResult = await this.callContainerPromise(cloud, '/recommendPlants', {
        method: 'POST',
        header: { 'content-type': 'application/json' },
        timeout: 30000
      }, {
        answers: dq.answers,
        topN: 10,
        userProfile: dq.userProfile
      });

      console.log('[recommendPlants] success:', recommendResult.statusCode);

      const recommendData = this.parseJson(recommendResult.data) || {};
      if (recommendData.ok && recommendData.data) {
        // 保存推荐结果到全局数据
        if (app.globalData) {
          app.globalData.tempRecommend = recommendData.data;
          app.globalData.tempAnswers = dq.answers;
          app.globalData.userProfile = dq.userProfile;
          app.globalData.recommendAlgorithm = recommendData.algorithm || 'enhanced';
        }

        // 成功后清理本地答案，避免下次进入自动复用导致过早结束
        try { tt.removeStorageSync('quiz_answers'); } catch(_){}

        // 跳转到结果页
        tt.redirectTo({ url: '/pages/result/index' });
      } else {
        throw new Error('推荐接口返回异常');
      }

    } catch (error) {
      console.error('[submitDynamicAnswers] error:', error);
      tt.showModal({
        title: '提交失败',
        content: error.message || '网络异常，请重试',
        showCancel: false
      });
    }
  },

  // Promise 封装 callContainer
  callContainerPromise(cloud, path, init, body) {
    return new Promise((resolve, reject) => {
      try {
        cloud.callContainer({
          path,
          init: {
            ...init,
            body: body ? JSON.stringify(body) : undefined
          },
          success: ({ statusCode, data, header }) => resolve({ statusCode, data, header }),
          fail: (err) => reject(err),
        });
      } catch (err) {
        reject(err);
      }
    });
  },

  // JSON 解析辅助方法
  parseJson(data) {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      return data;
    } catch (_) {
      return null;
    }
  },
  onSelect(e){
    const value = e.currentTarget.dataset.value;
    this.setData({ selected: value });

    // 写入临时答案
    try{
      const q = this.data.question;
      if (this.data.supportsDynamicQuestionnaire && this.dynamicQuestionnaire) {
        // 动态问卷模式：保存到动态问卷管理器
        if (q && q.id) {
          // 更新或添加答案
          const existingIndex = this.dynamicQuestionnaire.answers.findIndex(a => a.id === q.id);
          if (existingIndex >= 0) {
            this.dynamicQuestionnaire.answers[existingIndex].value = value;
          } else {
            this.dynamicQuestionnaire.answers.push({ id: q.id, value });
          }

          // 更新用户画像（兼容无 updateUserProfile 的实现）
          if (typeof this.updateUserProfile === 'function') {
            this.updateUserProfile(q.id, value);
          } else {
            this.rebuildUserProfile();
          }

          // 保存到本地存储
          tt.setStorageSync('quiz_answers', {
            dynamicAnswers: this.dynamicQuestionnaire.answers,
            userProfile: this.dynamicQuestionnaire.userProfile,
            timestamp: Date.now()
          });
        }
      } else {
        // 传统问卷模式
        const answers = tt.getStorageSync('quiz_answers') || {};
        if(q && q.id){ answers[q.id] = value; }
        tt.setStorageSync('quiz_answers', answers);
      }
    }catch(_){/* ignore */}
  },
  // 多选变更
  onMultiChange(e){
    const values = Array.isArray(e?.detail?.value) ? e.detail.value : [];
    this.setData({ selectedMulti: values, selected: '' });
    try{
      const q = this.data.question;
      if (this.data.supportsDynamicQuestionnaire && this.dynamicQuestionnaire) {
        if (q && q.id) {
          const idx = this.dynamicQuestionnaire.answers.findIndex(a => a.id === q.id);
          if (idx >= 0) {
            this.dynamicQuestionnaire.answers[idx].value = values;
          } else {
            this.dynamicQuestionnaire.answers.push({ id: q.id, value: values });
          }
          // 更新画像
          if (typeof this.updateUserProfile === 'function') {
            this.updateUserProfile(q.id, values);
          } else {
            this.rebuildUserProfile();
          }
          tt.setStorageSync('quiz_answers', {
            dynamicAnswers: this.dynamicQuestionnaire.answers,
            userProfile: this.dynamicQuestionnaire.userProfile,
            timestamp: Date.now()
          });
        }
      } else {
        const answers = tt.getStorageSync('quiz_answers') || {};
        if(q && q.id){ answers[q.id] = values; }
        tt.setStorageSync('quiz_answers', answers);
      }
    }catch(_){/* ignore */}
  },

  goPrev(){
    const { idx } = this.data;
    if(idx<=0){ return; }
    tt.navigateBack({ delta: 1 });
  },
  async goNext(){
    const { selected, selectedMulti, question } = this.data;
    const isMultiple = question && question.type === 'multiple';
    if((!isMultiple && !selected) || (isMultiple && (!Array.isArray(selectedMulti) || selectedMulti.length===0))){
      return tt.showToast({ icon:'none', title:'请先选择' });
    }
    try{ const stepDur = (Date.now() - (this._stepStartTs||Date.now())) || 0; logEvent('question_next', { qid: question?.id, stepDur }); }catch(_){ }

    if (this.data.supportsDynamicQuestionnaire && this.dynamicQuestionnaire) {
      // 动态问卷模式
      const dq = this.dynamicQuestionnaire;

      // 处理当前答案
      if (question && question.id) {
        const isMultiple = question.type === 'multiple';
        const val = isMultiple ? (Array.isArray(selectedMulti)?selectedMulti:[]) : selected;
        this.processDynamicAnswer(question.id, val);
      }

      // 自适应停止判断（MVP：基于启发式稳定度与追加题上限）
      const st = this.estimateStability();
      const needMore = !(st.top1 >= dq.stabilityThresholds.top1 && st.topN >= dq.stabilityThresholds.topN);

      // 至少保证基础3题（light/space/level）全部作答后才允许结束
      const basicAnswered = ['light','space','level'].every(id => dq.answers.some(a => a.id === id));

      // 若有待触发的安全题未作答，则优先进入安全阶段，不提前结束
      const hasPendingSafety = this.hasPendingSafetyQuestions();

      if ((!basicAnswered) || hasPendingSafety || (needMore && dq.extraCount < dq.maxExtra)) {
        // 进入下一题（基础题/安全题/追加题）
        dq.currentQuestionIndex++;
        if (basicAnswered) { dq.extraCount++; }
        try{ logEvent('adaptive_extra', { extra: dq.extraCount, qid: question?.id, top1: st.top1, topN: st.topN, pendingSafety: hasPendingSafety }); }catch(_){ }
        if (dq.extraCount >= dq.maxExtra) { try{ logEvent('adaptive_degrade', { reason:'max_extra_reached', extra:dq.extraCount }); }catch(_){ } }
      } else {
        // 完成问卷
        const dur = (Date.now() - (this._questionStartTs||Date.now())) || 0;
        try{ logEvent('adaptive_finish', { qcount: dq.answers.length, extra: dq.extraCount||0, dur }); }catch(_){ }
        return this.completeDynamicQuestionnaire();
      }

      // 获取下一个问题
      const nextQuestion = this.getNextDynamicQuestion();
      if (nextQuestion) {
        // 还有问题，更新页面
        const stepDur = (Date.now() - (this._stepStartTs||Date.now())) || 0;
        try{ logEvent('question_next', { qid: nextQuestion.id, stepDur }); }catch(_){ }
        try{ logEvent('question_enter', { qid: nextQuestion.id, phase: nextQuestion.phase }); }catch(_){ }
        this._stepStartTs = Date.now();
        this.setData({
          question: nextQuestion,
          currentPhase: nextQuestion.phase,
          phaseTitle: nextQuestion.phaseTitle,
          phaseDescription: nextQuestion.phaseDescription,
          questionIndex: nextQuestion.questionIndex,
          totalInPhase: nextQuestion.totalInPhase,
          overallProgress: nextQuestion.overallProgress,
          selected: '', // 清空选择（单选）
          selectedMulti: [] // 清空多选
        });
      } else {
        // 问卷完成
        const dur = (Date.now() - (this._questionStartTs||Date.now())) || 0;
        try{ logEvent('adaptive_finish', { qcount: dq.answers.length, extra: dq.extraCount||0, dur }); }catch(_){ }
        this.completeDynamicQuestionnaire();
      }
    } else {
      // 传统问卷模式
      const { idx, total } = this.data;
      if(idx < total - 1){
        tt.navigateTo({ url: `/pages/quiz/step/index?idx=${idx+1}` });
      } else {
        await this.submitAll();
      }
    }
  },
  async submitAll(){
    // 从 storage 收集答案
    const answersMap = tt.getStorageSync('quiz_answers') || {};
    const answersArr = Object.keys(answersMap).map((k)=>({ id:k, value: answersMap[k] }));
    if(answersArr.length === 0){ return tt.showToast({ icon:'none', title:'暂无答案' }); }

    const app = getApp();
    let cloud = app.globalData && app.globalData.cloud;
    if(!cloud){
      const { getConfig } = require('../../../config/config');
      const { envID, serviceID } = getConfig();
      cloud = tt.createCloud({ envID, serviceID });
      if(app.globalData){ app.globalData.cloud = cloud; }
    }
    // 用于结果页解释
    app.globalData.tempAnswers = answersArr;

    // 统一 Promise 封装，避免 SDK Promise 差异
    const callP = (path, init)=> new Promise((resolve, reject)=>{
      try{
        cloud.callContainer({ path, init,
          success: ({ statusCode, data, header }) => resolve({ statusCode, data, header }),
          fail: (err) => reject(err),
        });
      }catch(err){ reject(err); }
    });

    try{
      tt.showLoading({ title:'提交中' });
      // 1) 提交答案
      const payload1 = JSON.stringify({ answers: answersArr, clientTs: Date.now() });
      const r1 = await callP('/submitAnswers', { method:'POST', header:{ 'content-type':'application/json' }, body: payload1, timeout:60000 });
      const resp1 = parseJson(r1.data) || {};
      if(r1.statusCode!==200 || resp1.ok!==true){
        tt.hideLoading();
        return toastError(r1.statusCode||500, resp1.message||'提交失败');
      }
      // 2) 获取推荐（携带 pets/children 答案，后端进行安全过滤/降权）
      const payload2 = JSON.stringify({ answers: answersArr, topN: 10 });
      const r2 = await callP('/recommendPlants', { method:'POST', header:{ 'content-type':'application/json' }, body: payload2, timeout:60000 });
      tt.hideLoading();
      const resp2 = parseJson(r2.data) || {};
      if(r2.statusCode===200 && resp2.ok===true){
        app.globalData.tempRecommend = Array.isArray(resp2.data) ? resp2.data : [];
        // 清空缓存
        try{ tt.removeStorageSync('quiz_answers'); }catch(_){ }
        tt.navigateTo({ url:'/pages/result/index' });
      } else {
        const msg = (resp2 && (resp2.message||resp2.error)) || `HTTP ${r2.statusCode||''}`;
        toastError(r2.statusCode||500, msg);
      }
    } catch(e){
      tt.hideLoading();
      console.error('[submitAll] error:', e);
      tt.showToast({ icon:'none', title: e?.errMsg || e?.message || '提交失败' });
    }
  }
});

