const { parseJson } = require('../../utils/index');

Page({
  data:{ plant:{} },
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
      this.setData({ plant:item });
    }catch(e){
      // ignore
    }
  }
});

