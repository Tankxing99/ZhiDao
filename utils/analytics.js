// 轻量埋点封装（抖音小程序）
// 使用前请在「数据分析-自定义分析」创建事件：
// start_question, finish_question, question_next, adaptive_extra, adaptive_finish,
// rec_request, rec_response, rec_fallback, rec_mmr

export function logEvent(name, params = {}) {
  try {
    if (typeof tt !== 'undefined' && tt && typeof tt.reportAnalytics === 'function') {
      tt.reportAnalytics(name, sanitize(params));
    } else {
      console.log('[analytics]', name, sanitize(params));
    }
  } catch (e) {
    console.warn('[analytics] failed:', e?.message || e);
  }
}

function sanitize(obj) {
  try {
    const out = {};
    Object.keys(obj || {}).forEach(k => {
      const v = obj[k];
      if (v == null) return;
      const t = typeof v;
      if (t === 'string' || t === 'number' || t === 'boolean') out[k] = v;
      else out[k] = String(v);
    });
    return out;
  } catch (_) {
    return {};
  }
}

