const { parseJson, toastError } = require('../../utils/index');
const { getActiveFestivalLocal, toDateRangeText, getFestivalImagePath } = require('../../utils/festival');
const { getConfig } = require('../../config/config');
const { logEvent } = require('../../utils/analytics');

Page({
  data: {
    list: [],
    loading: false,
    festivalVisible: false,
    festival: null,
    festivalRecs: [],
  },
  onShow() {
    // 首页为落地页：不拉列表；进入时检查是否需要弹出节日推荐
    this.tryShowFestivalModal();
  },
  async tryShowFestivalModal() {
    try {
      const suppressKey = this.getCurrentFestivalSuppressKey();
      const lastShownKey = this.getCurrentFestivalLastShownKey();
      const suppress = tt.getStorageSync(suppressKey);
      const last = parseInt(tt.getStorageSync(lastShownKey) || 0, 10);
      const nowTs = Date.now();

      // 先请求后端
      const app = getApp();
      const cloud = app.globalData && app.globalData.cloud;
      let f = null; let rec = [];
      try {
        const { FESTIVAL_API_TIMEOUT_MS, ANALYTICS_ENABLED } = getConfig();
        const { data, statusCode } = await cloud.callContainer({
          path: '/getFestivalRecommendation',
          init: { method: 'GET', header: { 'content-type': 'application/json' }, timeout: FESTIVAL_API_TIMEOUT_MS },
        });
        const resp = parseJson(data) || {};
        if (statusCode === 200 && resp && resp.ok && resp.data && resp.data.festival) {
          f = resp.data.festival;
          rec = resp.data.recommendations || [];
        }
      } catch (e) {
        // ignore
      }

      if (!f) {
        // 后端无数据走本地兜底（仅当天命中）
        const local = getActiveFestivalLocal(new Date());
        if (local) { f = local; rec = local.recommendations || []; }
      }

      if (!f) return; // 无节日不弹

      // 频控：本节日有效期内“本节日不再提醒”，或24h内已展示
      const fid = f.id || (f.festivalKey + '_' + new Date().getFullYear());
      const dayKey = `festival:lastShown:${fid}`;
      const neverKey = `festival:suppress:${fid}`;
      const never = tt.getStorageSync(neverKey);
      const lastShown = parseInt(tt.getStorageSync(dayKey) || 0, 10);
      if (never) return;
      if (nowTs - lastShown < 24*60*60*1000) return;

      f.dateText = toDateRangeText(f.startDate, f.endDate);
      // Cover: map to images/festivals; fallback to placeholder
      f.cover = getFestivalImagePath(f) || f.cover || '/images/plant-placeholder.png';

      this.setData({ festivalVisible: true, festival: f, festivalRecs: rec });
      tt.setStorageSync(dayKey, nowTs);
      if (ANALYTICS_ENABLED) logEvent('festival_popup_show', { festivalId: f.id || f.festivalKey, version: f.version || '' });
    } catch (e) {
      // ignore
    }
  },
  getCurrentFestivalSuppressKey(){
    return 'festival:suppress:current';
  },
  getCurrentFestivalLastShownKey(){
    return 'festival:lastShown:current';
  },
  onFestivalClose(){
    this.setData({ festivalVisible: false });
  },
  onFestivalAction(e){
    const t = e.detail && e.detail.type;
    const f = this.data.festival;
    if (!f) return this.onFestivalClose();
    const fid = f.id || (f.festivalKey + '_' + new Date().getFullYear());
    if (t === 'never') {
      tt.setStorageSync(`festival:suppress:${fid}`, 1);
      const { ANALYTICS_ENABLED } = getConfig();
      if (ANALYTICS_ENABLED) logEvent('festival_popup_click_never', { festivalId: fid });
      this.onFestivalClose();
      return;
    }
    if (t === 'view') {
      const { ANALYTICS_ENABLED } = getConfig();
      if (ANALYTICS_ENABLED) logEvent('festival_popup_click_view', { festivalId: fid });
      // 跳转到节日推荐页
      tt.switchTab({ url: '/pages/festival/index' });
      this.onFestivalClose();
      return;
    }
    // later
    {
      const { ANALYTICS_ENABLED } = getConfig();
      if (ANALYTICS_ENABLED) logEvent('festival_popup_click_later', { festivalId: fid });
    }
    this.onFestivalClose();
  },

  // 以下保留原有逻辑
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
    tt.navigateTo({ url: '/pages/quiz/step/index?idx=0' });
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    tt.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },
});
