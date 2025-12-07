const { parseJson } = require('../../utils/index');

Page({
  data:{ plant:{}, plantDetail:{} },
  async onLoad(options){
    const id = options?.id;
    if(!id){ return; }
    try{
      const app = getApp();
      const cloud = app.globalData.cloud;
      const { statusCode, data } = await cloud.callContainer({
        path:'/listPlants',
        init:{ method:'POST', header:{ 'content-type':'application/json' }, body:{ page:1, pageSize:50, tags:[] } }
      });
      const resp = parseJson(data) || {};
      const item = (resp.data || []).find(p=>p.id===id) || {};

      // 尝试从植物知识库获取详细信息
      const plantDetail = await this.getPlantDetail(id);

      this.setData({
        plant: item,
        plantDetail: plantDetail || {}
      });
    }catch(e){
      console.error('详情页加载失败:', e);
    }
  },

  // 从植物知识库获取详细信息
  async getPlantDetail(plantId) {
    try {
      const app = getApp();
      const cloud = app.globalData.cloud;
      const { statusCode, data } = await cloud.callContainer({
        path: '/getPlantDetail',
        init: {
          method: 'POST',
          header: { 'content-type': 'application/json' },
          body: JSON.stringify({ plantId })
        }
      });

      if (statusCode === 200) {
        const resp = parseJson(data) || {};
        return resp.data || null;
      }
    } catch (e) {
      console.error('获取植物详情失败:', e);
    }
    return null;
  }
});

