Page({
  data:{
    list:[]
  },
  onShow(){
    const app = getApp();
    const list = app.globalData?.tempRecommend || [];
    this.setData({ list });
  },
  goDetail(e){
    const id = e.currentTarget.dataset.id;
    tt.navigateTo({ url: `/pages/detail/index?id=${id}` });
  }
});

