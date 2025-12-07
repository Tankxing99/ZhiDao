// Festival recommendation backend helpers
// Data model expectation (DB collection: festival_recommendations):
// { id, festivalKey, name, startDate, endDate, status, priority, popupCopy, recommendations: [{plantId, reason, weight, cover?}], updatedAt, version }

import { dySDK } from '@open-dy/node-server-sdk';

export async function queryActiveOrUpcomingFestival(daysAhead = 14) {
  const db = dySDK.database();
  const now = Date.now();
  const nowISO = new Date(now).toISOString();

  // 1) active: startDate <= now <= endDate
  let active = [];
  try {
    const res = await db.collection('festival_recommendations')
      .where({ status: 'active' })
      .get();
    active = (res.data || []).filter(x => x.startDate <= nowISO && x.endDate >= nowISO)
      .sort((a,b)=> (b.priority||0)-(a.priority||0));
  } catch (_) { active = []; }

  if (active.length > 0) {
    return active[0];
  }

  // 2) upcoming within N days
  try {
    const res = await db.collection('festival_recommendations')
      .where({ status: 'active' })
      .get();
    const endTs = now + daysAhead*24*60*60*1000;
    const up = (res.data || [])
      .filter(x => x.startDate > nowISO && new Date(x.startDate).getTime() <= endTs)
      .sort((a,b)=> new Date(a.startDate) - new Date(b.startDate));
    if (up.length>0) return up[0];
  } catch (_) { /* ignore */ }

  return null;
}

export function buildFestivalResponse(doc, plantsLite = []){
  if (!doc) return { ok: true, data: null };
  const festival = {
    id: doc.id,
    festivalKey: doc.festivalKey,
    name: doc.name,
    startDate: doc.startDate,
    endDate: doc.endDate,
    copy: doc.popupCopy || {},
    cover: (doc.popupCopy && doc.popupCopy.cover) || '',
  };
  const recommendations = (doc.recommendations || []).map(r => {
    const plant = plantsLite.find(p => p.id === r.plantId);
    return {
      id: r.plantId,
      name: (plant && plant.name) || r.name || '',
      cover: r.cover || (plant && plant.cover) || '',
      reason: r.reason || '',
    };
  });
  return { ok: true, data: { festival, recommendations } };
}

