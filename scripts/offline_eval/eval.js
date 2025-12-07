// Minimal offline evaluation skeleton (no deps, placeholder only)
// You can copy and extend this file outside of the miniapp repo to avoid bundling deps here.
const fs = require('fs');
const path = require('path');

function jaccard(a = [], b = []) {
  const sa = new Set(a || []);
  const sb = new Set(b || []);
  let inter = 0;
  sa.forEach(x => { if (sb.has(x)) inter++; });
  const union = sa.size + sb.size - inter;
  return union > 0 ? inter / union : 0;
}

function ndcgAtK(relevances, k = 5) {
  const rel = relevances.slice(0, k);
  const dcg = rel.reduce((acc, r, i) => acc + (r / Math.log2(i + 2)), 0);
  const ideal = relevances.slice().sort((a,b)=>b-a).slice(0,k)
    .reduce((acc, r, i) => acc + (r / Math.log2(i + 2)), 0);
  return ideal > 0 ? dcg / ideal : 0;
}

function loadJson(rel){
  const p = path.join(__dirname, 'data', rel);
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function baseScore(answersMap, plant){
  const tags = plant.tags || [];
  const match = ['light','space','level'].reduce((acc, dim)=>acc + (tags.includes(answersMap[dim]) ? 1 : 0), 0);
  return match; // 0~3
}

function applyUncertainty(scored, answersMap, lambda_unc){
  return scored.map(p => {
    const tags = p.tags || [];
    const dims = ['light','space','level'];
    const matched = dims.reduce((acc, d)=>acc + (tags.includes(answersMap[d]) ? 1 : 0), 0);
    const unc = 1 - (matched / dims.length);
    return { ...p, score: p.score - lambda_unc * unc };
  });
}

function mmrRerank(list, topN, mmr_lambda){
  const R = [];
  const L = list.slice();
  while(R.length < topN && L.length > 0){
    let bi = 0, bs = -Infinity;
    for(let i=0;i<L.length;i++){
      const cand = L[i];
      let maxSim = 0;
      for(const r of R){
        const s = jaccard(cand.tags||[], r.tags||[]);
        if(s>maxSim) maxSim=s;
      }
      const mmr = mmr_lambda*cand.score - (1-mmr_lambda)*maxSim;
      if(mmr>bs){ bs=mmr; bi=i; }
    }
    R.push(L[bi]);
    L.splice(bi,1);
  }
  return R;
}

function evalOne(users, plants, params){
  const { lambda_unc=0.2, mmr_lambda=0.7, topM=50, topN=10 } = params;
  let ndcg5Sum=0, ndcg10Sum=0, iladSum=0, coverSet=new Set(), count=0;
  for(const u of users){
    const map = Object.fromEntries((u.answers||[]).map(a=>[a.id,a.value]));
    let scored = plants.filter(p=>p.onShelf).map(p=>({ id:p.id, score: baseScore(map, p), tags:p.tags||[] }));
    // 不确定性惩罚
    scored = applyUncertainty(scored, map, lambda_unc);
    // 初排 & Top-M
    scored.sort((a,b)=>b.score-a.score);
    const topMlist = scored.slice(0, Math.min(topM, scored.length));
    // MMR重排
    const reranked = mmrRerank(topMlist, topN, mmr_lambda);
    // ILAD
    let pairs=0,sum=0; for(let i=0;i<reranked.length;i++){ for(let j=i+1;j<reranked.length;j++){ sum += (1-jaccard(reranked[i].tags, reranked[j].tags)); pairs++; } }
    const ilad = pairs>0 ? (sum/pairs) : 0;
    // NDCG（以score为相关性代理）
    const relevances = reranked.map(x=>x.score);
    const ndcg5 = ndcgAtK(relevances, 5);
    const ndcg10 = ndcgAtK(relevances, 10);
    reranked.forEach(x=>coverSet.add(x.id));
    ndcg5Sum+=ndcg5; ndcg10Sum+=ndcg10; iladSum+=ilad; count++;
  }
  return {
    lambda_unc, mmr_lambda, topM, topN,
    ndcg5: count? ndcg5Sum/count : 0,
    ndcg10: count? ndcg10Sum/count : 0,
    ilad: count? iladSum/count : 0,
    coverage: plants.length? (coverSet.size/plants.length) : 0
  };
}

function gridSearch(users, plants){
  const lambda_unc_list = [0, 0.1, 0.2, 0.3];
  const mmr_lambda_list = [0.5, 0.7, 0.9];
  const topM_list = [20, 50, 100];
  const results = [];
  for(const lu of lambda_unc_list){
    for(const ml of mmr_lambda_list){
      for(const tm of topM_list){
        results.push(evalOne(users, plants, { lambda_unc: lu, mmr_lambda: ml, topM: tm, topN: 10 }));
      }
    }
  }
  return results;
}

function main(){
  const users = loadJson('users.json');
  const plants = loadJson('plants.json');
  const out = gridSearch(users, plants);
  console.log(JSON.stringify({ ok:true, results: out }, null, 2));
  // write CSV
  const header = ['lambda_unc','mmr_lambda','topM','topN','ndcg5','ndcg10','ilad','coverage'];
  const lines = [header.join(',')].concat(out.map(r=>[
    r.lambda_unc, r.mmr_lambda, r.topM, r.topN, r.ndcg5.toFixed(4), r.ndcg10.toFixed(4), r.ilad.toFixed(4), r.coverage.toFixed(4)
  ].join(',')));
  try{ fs.writeFileSync(path.join(__dirname,'results.csv'), lines.join('\n'), 'utf-8'); }catch(_){ }
  // pick top-5 by ndcg5 then ilad
  const top5 = out.slice().sort((a,b)=>{
    if (b.ndcg5 !== a.ndcg5) return b.ndcg5 - a.ndcg5;
    return b.ilad - a.ilad;
  }).slice(0,5);
  try{ fs.writeFileSync(path.join(__dirname,'top5.json'), JSON.stringify(top5, null, 2), 'utf-8'); }catch(_){ }
}

if(require.main === module){
  main();
}

