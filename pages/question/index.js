const { parseJson, toastError } = require('../../utils/index');
const { getConfig } = require('../../config/config');

Page({
  data: {
    answers: {}
  },
  onChange(e){
    const id = e.currentTarget.dataset.id;
    const value = e.detail.value;
    const answers = this.data.answers;
    answers[id] = value;
    this.setData({ answers });
  },
  submit(){
    const a = this.data.answers;
    if(!a.light || !a.space || !a.level){
      return tt.showToast({ icon:'none', title:'请完成所有问题' });
    }
    const app = getApp();
    const cloud = app.globalData.cloud;
    const body = { answers:[
      { id:'light', value:a.light },
      { id:'space', value:a.space },
      { id:'level', value:a.level }
    ] };
    const payload = JSON.stringify(body);
    tt.showLoading({ title: '提交中' });
    cloud.callContainer({
      path:'/submitAnswers',
      init:{ method:'POST', header:{ 'content-type':'application/json' }, body: payload, timeout: 60000 },
      success: ({ statusCode, data }) => {
        tt.hideLoading();
        console.log('[submitAnswers] success', statusCode, data);
        const resp = parseJson(data) || {};
        if(statusCode===200 && resp.ok===true){
          // 提交成功后，拉取推荐结果
          this.fetchRecommend(a);
        } else {
          const msg = (resp && (resp.message||resp.error)) || `提交失败(${statusCode||''})`;
          toastError(statusCode||500, msg);
        }
      },
      fail: (res) => {
        tt.hideLoading();
        console.warn('[submitAnswers] fail', res);
        const errMsg = res?.errMsg || '提交失败';
        tt.showToast({ icon: 'none', title: errMsg });
      }
    });
  },
  // 拉取推荐
  fetchRecommend(a){
    const app = getApp();
    const cloud = app.globalData.cloud;
    const body = { answers:[
      { id:'light', value:a.light },
      { id:'space', value:a.space },
      { id:'level', value:a.level }
    ], topN: 10 };
    const payload = JSON.stringify(body);
    tt.showLoading({ title: '获取推荐' });
    cloud.callContainer({
      path:'/recommendPlants',
      init:{ method:'POST', header:{ 'content-type':'application/json' }, body: payload, timeout: 60000 },
      success: ({ statusCode, data }) => {
        tt.hideLoading();
        const resp = parseJson(data) || {};
        if(statusCode===200 && resp.ok===true){
          const list = resp.data || [];
          const app = getApp();
          app.globalData.tempRecommend = list;
          tt.navigateTo({ url: '/pages/result/index' });
        } else {
          const msg = (resp && (resp.message||resp.error)) || `推荐失败(${statusCode||''})`;
          toastError(statusCode||500, msg);
        }
      },
      fail: (res) => {
        tt.hideLoading();
        const errMsg = res?.errMsg || '推荐失败';
        tt.showToast({ icon: 'none', title: errMsg });
      }
    });
  }
});

