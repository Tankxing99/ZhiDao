const { getRecommendationReason } = require('../../utils/recommend');

Page({
  data:{
    list:[]
  },
  onShow(){
    const app = getApp();
    const list = app.globalData?.tempRecommend || [];
    const answers = app.globalData?.tempAnswers || null;
    const enhanced = (list || []).map((item)=>{
      if(!answers){ return item; }
      try{
        const r = getRecommendationReason(answers, item) || {};
        const exact = (r.exactMatches||[]).join('、') || '无';
        const compat = (r.compatibleMatches||[]).join('、') || '无';
        const reasonText = `契合:${exact}  兼容:${compat}  分:${r.score||0}`;
        return { ...item, _reason: r, _reasonText: reasonText };
      }catch(_){
        return item;
      }
    });
    this.setData({ list: enhanced });
  },
  goDetail(e){
    const id = e.currentTarget.dataset.id;
    tt.navigateTo({ url: `/pages/detail/index?id=${id}` });
  }
});

