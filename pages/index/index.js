const cloud = getApp().globalData?.cloud;
const { parseJson, toastError } = require('../../utils/index');

Page({
  data: {
    list: [],
    loading: false,
  },
  onLoad() {
    this.loadPlants();
  },
  async loadPlants() {
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
    tt.navigateTo({ url: '/pages/question/index' });
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    tt.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },
});
