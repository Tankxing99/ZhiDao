const cloud = getApp().globalData?.cloud;
const { parseJson, toastError } = require('../../utils/index');

Page({
  data: {
    list: [],
    loading: false,
  },
  onLoad() {
    // 首页改为落地页，不在首屏拉列表，保留方法以便后续扩展
  },
  async loadPlants() {
    // 如后续需要在首页展示列表，可调用该方法
    this.setData({ loading: true });
    try {
      const app = getApp();
      const cloud = app.globalData.cloud;
      const payload = JSON.stringify({ page: 1, pageSize: 20 });
      const { data, statusCode } = await cloud.callContainer({
        path: '/listPlants',
        init: {
          method: 'POST',
          header: { 'content-type': 'application/json' },
          body: payload,
          timeout: 60000,
        },
      });
      const resp = parseJson(data) || {};
      if (statusCode !== 200 || resp.ok !== true) {
        return toastError(statusCode, resp.message || '请求失败');
      }
      this.setData({ list: resp.data || [] });
    } catch (e) {
      tt.showToast({ icon: 'none', title: '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },
  goQuestion() {
    // 改为逐题作答页面
    tt.navigateTo({ url: '/pages/quiz/step/index?idx=0' });
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    tt.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },
});
