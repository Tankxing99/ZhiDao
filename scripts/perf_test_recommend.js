/*
  Local/dev performance test for /recommendPlants
  Usage:
    node scripts/perf_test_recommend.js
  Notes:
    - Targets dev environment container: path "/recommendPlants" via Cloud.callContainer-compatible HTTP.
    - For simplicity, use fetch against an exposed base URL. If your dev service
      is only accessible via callContainer, you can set BASE_URL to the gateway URL
      (e.g., http://127.0.0.1:8000 when running locally, or the dev public URL if exposed).
*/

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ====== Configuration ======
const BASE_URL = process.env.API_BASE || 'http://127.0.0.1:8000'; // adjust to your dev gateway
const PATH = '/recommendPlants';
const REQUESTS = Number(process.env.N || 20);

const LIGHT = ['low', 'medium', 'high'];
const SPACE = ['small', 'medium', 'large'];
const LEVEL = ['beginner', 'intermediate', 'expert'];

function pick(arr, i) { return arr[i % arr.length]; }

function genPayload(i) {
  const answers = [
    { id: 'light', value: pick(LIGHT, i) },
    { id: 'space', value: pick(SPACE, Math.floor(i/3)) },
    { id: 'level', value: pick(LEVEL, Math.floor(i/9)) }
  ];
  return { answers, topN: 5 };
}

function doFetch(urlStr, payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const isHttps = u.protocol === 'https:';
    const body = Buffer.from(JSON.stringify(payload));
    const opts = {
      method: 'POST',
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      headers: {
        'content-type': 'application/json',
        'content-length': body.length
      },
      timeout: 60000,
      agent: isHttps ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true })
    };
    const req = (isHttps ? https : http).request(opts, (res) => {
      let data = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const obj = typeof data === 'string' ? JSON.parse(data) : data;
          resolve({ statusCode: res.statusCode, data: obj });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: { ok: false, parseError: String(e), raw: data } });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.write(body);
    req.end();
  });
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[idx];
}

(async function main() {
  const url = BASE_URL.replace(/\/$/, '') + PATH;
  console.log('[perf] target:', url, 'requests:', REQUESTS);

  const elapsedArr = [];
  const mmrArr = [];
  const candArr = [];
  let fallbackCount = 0;
  const riskCountMap = new Map();

  for (let i = 0; i < REQUESTS; i++) {
    const payload = genPayload(i);
    const t0 = Date.now();
    const resp = await doFetch(url, payload).catch((e) => ({ statusCode: 0, data: { ok: false, error: String(e) } }));
    const dt = Date.now() - t0;

    if (resp.statusCode === 200 && resp.data && resp.data.ok) {
      const dbg = resp.data.debug || {};
      elapsedArr.push(Number(dbg.elapsed || dt));
      mmrArr.push(Number(dbg.mmrCostMs || 0));
      candArr.push(Number(dbg.candidateTotal || 0));
      if (dbg.fallback) fallbackCount++;
      if (Array.isArray(dbg.riskFlags)) {
        for (const f of dbg.riskFlags) {
          riskCountMap.set(f, (riskCountMap.get(f) || 0) + 1);
        }
      }
    } else {
      // treat as fallback-style issue
      fallbackCount++;
    }
  }

  const stat = (arr) => ({
    count: arr.length,
    min: arr.length ? Math.min(...arr) : 0,
    max: arr.length ? Math.max(...arr) : 0,
    avg: arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0,
    p50: percentile(arr, 50),
    p95: percentile(arr, 95)
  });

  const elapsedStat = stat(elapsedArr);
  const mmrStat = stat(mmrArr);
  const candStat = stat(candArr);

  const riskSummary = Array.from(riskCountMap.entries()).map(([k, v]) => ({ flag: k, count: v }))
    .sort((a, b) => b.count - a.count);

  console.log('\n[perf] Results');
  console.log('  elapsed (ms):', elapsedStat);
  console.log('  mmrCostMs (ms):', mmrStat);
  console.log('  candidateTotal:', candStat);
  console.log('  fallbackCount:', fallbackCount, '/', REQUESTS);
  if (riskSummary.length) console.log('  riskFlags:', riskSummary);
})();

