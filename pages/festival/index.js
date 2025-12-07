const { parseJson } = require('../../utils/index');
const { toDateRangeText, listAllFestivalsLocal, getFestivalImagePath } = require('../../utils/festival');
const { getConfig } = require('../../config/config');
const { logEvent } = require('../../utils/analytics');

Page({
  data: {
    festivalList: [], // 新：展示所有节日
    loading: false,
  },
  onShow() {
    this.loadFestivalData();
  },
  async loadFestivalData() {
    this.setData({ loading: true });
    const app = getApp();
    const cloud = app.globalData && app.globalData.cloud;
    let list = [];
    try {
      const { FESTIVAL_API_TIMEOUT_MS } = getConfig();
      const { data, statusCode } = await cloud.callContainer({
        path: '/listFestivals',
        init: { method: 'GET', header: { 'content-type': 'application/json' }, timeout: FESTIVAL_API_TIMEOUT_MS },
      });
      const resp = parseJson(data) || {};
      if (statusCode === 200 && resp && resp.ok && Array.isArray(resp.data)) {
        list = resp.data.map(f => {
          const cover = getFestivalImagePath(f) || '/images/plant-placeholder.png';
          return {
            id: f.id,
            name: f.name,
            cover,
            startDate: f.startDate,
            endDate: f.endDate,
            dateText: toDateRangeText(f.startDate, f.endDate),
            desc: (f.popupCopy && f.popupCopy.subtitle) || f.subtitle || '',
            location: f.location || '全国各地',
            collected: !!f.collected,
            rating: f.rating || '',
            recommendations: (f.recommendations || []).map(r => ({ id: r.plantId, name: r.name, cover: r.cover || '', reason: r.reason }))
          };
        });
      }
    } catch (_) { /* ignore */ }

    if (!list || list.length === 0) {
      const y = new Date().getFullYear();
      list = listAllFestivalsLocal(y).map(f => {
        const cover = getFestivalImagePath(f) || '/images/plant-placeholder.png';
        return {
          id: f.id,
          name: f.name,
          cover,
          startDate: f.startDate,
          endDate: f.endDate,
          dateText: toDateRangeText(f.startDate, f.endDate),
          desc: (f.copy && f.copy.subtitle) || '',
          location: f.location || '全国各地',
          collected: !!f.collected,
          rating: f.rating || '',
          recommendations: (f.recommendations || []).map(r => ({ id: r.id || r.plantId, name: r.name, cover: r.cover || '', reason: r.reason }))
        };
      });
    }

    list.sort((a,b)=> new Date(a.startDate) - new Date(b.startDate));
    // 完整性校验：如未映射到 images/festivals 下资源，给出明确提示（控制台）
    const _missingCovers = list.filter(it => !it.cover || it.cover.indexOf('/images/festivals/') !== 0).map(it => it.name);
    if (_missingCovers.length) {
      console.warn('[festival] 缺少本地图片映射（将使用占位图）：', _missingCovers);
    }

    this.setData({ festivalList: list, loading: false });

    try { const { ANALYTICS_ENABLED } = getConfig(); if (ANALYTICS_ENABLED) logEvent('festival_page_view', { festivalId: 'list' }); } catch(_){}
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    const pos = e.currentTarget.dataset.pos;
    const fid = e.currentTarget.dataset.fid || 'list';
    if (!id) return;
    try { const { ANALYTICS_ENABLED } = getConfig(); if (ANALYTICS_ENABLED) logEvent('festival_plant_click', { festivalId: fid, plantId: id, position: pos }); } catch(_){ }
    tt.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },


});

