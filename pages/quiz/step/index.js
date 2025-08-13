const { parseJson, toastError } = require('../../../utils/index');

Page({
  data: {
    idx: 0,
    total: 0,
    question: null,
    selected: '',
    loading: true,
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
        const { statusCode, data } = await cloud.callContainer({
          path: '/getQuestionConfig',
          init: { method: 'GET', header: { 'content-type': 'application/json' }, timeout: 30000 },
        });
        const resp = parseJson(data) || {};
        if(statusCode===200 && resp.ok===true){
          cfg = { version: resp.version, questions: resp.questions||[] };
          tt.setStorageSync('question_config_cache', cfg);
        } else {
          throw new Error((resp && (resp.message||resp.error)) || `HTTP ${statusCode}`);
        }
      } catch(e){
        toastError(500, e?.message || '拉取题目失败');
        cfg = { version:'v0', questions: [] };
      }
    }
    this._cfg = cfg;
  },
  applyQuestion(){
    const qs = (this._cfg && this._cfg.questions) || [];
    const total = qs.length;
    const idx = this.data.idx;
    const q = qs[idx] || null;
    this.setData({ total, question: q, loading: false });
    // 恢复选择
    try{
      const answers = tt.getStorageSync('quiz_answers') || {};
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

    try{
      tt.showLoading({ title:'提交中' });
      // 1) 提交答案
      const payload1 = JSON.stringify({ answers: answersArr, clientTs: Date.now() });
      const r1 = await cloud.callContainer({
        path:'/submitAnswers',
        init:{ method:'POST', header:{ 'content-type':'application/json' }, body: payload1, timeout:60000 }
      });
      const resp1 = parseJson(r1.data) || {};
      if(r1.statusCode!==200 || resp1.ok!==true){
        tt.hideLoading();
        return toastError(r1.statusCode||500, resp1.message||'提交失败');
      }
      // 2) 获取推荐
      const payload2 = JSON.stringify({ answers: answersArr, topN: 10 });
      const r2 = await cloud.callContainer({
        path:'/recommendPlants',
        init:{ method:'POST', header:{ 'content-type':'application/json' }, body: payload2, timeout:60000 }
      });
      tt.hideLoading();
      const resp2 = parseJson(r2.data) || {};
      if(r2.statusCode===200 && resp2.ok===true){
        app.globalData.tempRecommend = resp2.data || [];
        // 清空缓存
        try{ tt.removeStorageSync('quiz_answers'); }catch(_){ }
        tt.navigateTo({ url:'/pages/result/index' });
      } else {
        const msg = (resp2 && (resp2.message||resp2.error)) || `HTTP ${r2.statusCode||''}`;
        toastError(r2.statusCode||500, msg);
      }
    } catch(e){
      tt.hideLoading();
      tt.showToast({ icon:'none', title: e?.errMsg || e?.message || '提交失败' });
    }
  }
});

