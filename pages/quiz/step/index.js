const { parseJson, toastError } = require('../../../utils/index');

Page({
  data: {
    idx: 0,
    total: 0,
    question: null,
    selected: '',
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
    dynamicQuestionnaire: null,
  },
  async onLoad(options){
    const idx = Number(options?.idx || 0);
    this.setData({ idx });
    await this.ensureConfigLoaded();
    this.applyQuestion();
  },
  onShow(){
    // 恢复已选答案
    try{
      const answers = tt.getStorageSync('quiz_answers') || {};
      const q = this.data.question;
      if(q && answers[q.id]){
        this.setData({ selected: answers[q.id] });
      }
    }catch(_){/* ignore */}
  },
  async ensureConfigLoaded(){
    // 本地缓存优先
    let cfg = tt.getStorageSync('question_config_cache');
    if(!cfg || !cfg.version || !Array.isArray(cfg.questions)){
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
    // 简化版动态问卷管理器（内联实现）
    this.dynamicQuestionnaire = {
      questionBank,
      userProfile: {},
      answers: [],
      currentPhase: 'userProfile',
      currentQuestionIndex: 0,
      phaseOrder: ['userProfile', 'environment', 'aesthetic', 'safety']
    };

    // 恢复之前的答案
    try {
      const savedAnswers = tt.getStorageSync('quiz_answers') || {};
      if (savedAnswers.dynamicAnswers) {
        this.dynamicQuestionnaire.answers = savedAnswers.dynamicAnswers;
        this.rebuildUserProfile();
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
    if (!dq) return null;

    const currentPhaseConfig = dq.questionBank[dq.currentPhase];
    if (!currentPhaseConfig) return null;

    // 检查当前阶段是否还有问题
    if (dq.currentQuestionIndex < currentPhaseConfig.questions.length) {
      const question = currentPhaseConfig.questions[dq.currentQuestionIndex];
      return {
        ...question,
        phase: dq.currentPhase,
        phaseTitle: currentPhaseConfig.name,
        phaseDescription: currentPhaseConfig.description,
        questionIndex: dq.currentQuestionIndex,
        totalInPhase: currentPhaseConfig.questions.length,
        overallProgress: this.calculateOverallProgress()
      };
    }

    // 当前阶段完成，切换到下一阶段
    this.moveToNextPhase();
    return this.getNextDynamicQuestion();
  },

  // 移动到下一阶段
  moveToNextPhase() {
    const dq = this.dynamicQuestionnaire;
    const currentIndex = dq.phaseOrder.indexOf(dq.currentPhase);

    // 寻找下一个需要触发的阶段
    for (let i = currentIndex + 1; i < dq.phaseOrder.length; i++) {
      const nextPhase = dq.phaseOrder[i];
      if (this.shouldTriggerPhase(nextPhase)) {
        dq.currentPhase = nextPhase;
        dq.currentQuestionIndex = 0;
        return;
      }
    }

    // 没有更多阶段，问卷结束
    dq.currentPhase = 'completed';
  },

  // 判断是否应该触发某个阶段
  shouldTriggerPhase(phase) {
    const dq = this.dynamicQuestionnaire;
    const phaseConfig = dq.questionBank[phase];
    if (!phaseConfig || !phaseConfig.triggerConditions) return true;

    const conditions = phaseConfig.triggerConditions;

    // 如果条件是 "all"，总是触发
    if (conditions.includes('all')) return true;

    // 检查用户画像是否匹配触发条件
    return conditions.some(condition => dq.userProfile[condition]);
  },

  // 计算整体进度
  calculateOverallProgress() {
    const dq = this.dynamicQuestionnaire;
    let totalQuestions = 0;
    let answeredQuestions = dq.answers.length;

    // 计算需要回答的总问题数（基于触发条件）
    dq.phaseOrder.forEach(phase => {
      if (this.shouldTriggerPhase(phase)) {
        const phaseConfig = dq.questionBank[phase];
        if (phaseConfig) {
          totalQuestions += phaseConfig.questions.length;
        }
      }
    });

    return {
      current: answeredQuestions,
      total: totalQuestions,
      percentage: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
    };
  },

  applyQuestion(){
    if (this.data.supportsDynamicQuestionnaire) {
      // 使用动态问卷
      const questionData = this.getNextDynamicQuestion();
      if (questionData) {
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
        this.setData({ loading: false });
        this.completeDynamicQuestionnaire();
        return;
      }
    } else {
      // 使用传统问卷
      const qs = (this._cfg && this._cfg.questions) || [];
      const total = qs.length;
      const idx = this.data.idx;
      const q = qs[idx] || null;
      this.setData({ total, question: q, loading: false });
    }

    // 恢复选择
    try{
      const answers = tt.getStorageSync('quiz_answers') || {};
      const q = this.data.question;
      if(q && answers[q.id]){ this.setData({ selected: answers[q.id] }); }
    }catch(_){/* ignore */}
  },
  onSelect(e){
    const value = e.currentTarget.dataset.value;
    this.setData({ selected: value });
    // 写入临时答案
    try{
      const q = this.data.question;
      const answers = tt.getStorageSync('quiz_answers') || {};
      if(q && q.id){ answers[q.id] = value; }
      tt.setStorageSync('quiz_answers', answers);
    }catch(_){/* ignore */}
  },
  goPrev(){
    const { idx } = this.data;
    if(idx<=0){ return; }
    tt.navigateBack({ delta: 1 });
  },
  async goNext(){
    const { idx, total, selected, question } = this.data;
    if(!selected){ return tt.showToast({ icon:'none', title:'请先选择' }); }
    // 已保存于 storage，无需重复处理
    if(idx < total - 1){
      tt.navigateTo({ url: `/pages/quiz/step/index?idx=${idx+1}` });
    } else {
      await this.submitAll();
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

