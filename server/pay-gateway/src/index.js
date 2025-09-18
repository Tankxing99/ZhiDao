import express from 'express';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 8000;

// capture raw body if needed in future (e.g., signature)
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', (req, res) => {
  res.json({ ok: true, ts: Date.now(), service: 'pay-gateway' });
});

// 调试端点：测试签名算法
app.post('/debug-signature', (req, res) => {
  try {
    const { orderNo, amount, ctxInfo, notifyUrl, appId } = req.body;
    const subject = ctxInfo?.subject || 'ZhiDao-Order';
    const body = ctxInfo?.body || 'ZhiDao-Pay';

    const cfg = {
      appId: process.env.DY_PAY_APP_ID || appId,
      paySalt: process.env.DY_PAY_SALT,
      preorderUrl: process.env.DY_ECPAY_PRECREATE_URL,
    };

    const payload = {
      app_id: cfg.appId,
      out_order_no: String(orderNo),
      total_amount: Number(amount),
      subject: subject,
      body: body,
      valid_time: 1800,
      notify_url: notifyUrl || process.env.PAY_NOTIFY_URL,
    };

    const ysd = signWithVariant(payload, cfg.paySalt, 'ysd', true);
    const ysdApp = signWithVariant(payload, cfg.paySalt, 'ysd_appid', true);
    const saltEnd = signWithVariant(payload, cfg.paySalt, 'salt_end', true);
    const saltEndApp = signWithVariant(payload, cfg.paySalt, 'salt_end_appid', true);
    const saltEndNa = signWithVariant(payload, cfg.paySalt, 'salt_end_na', true);
    const saltEndNaApp = signWithVariant(payload, cfg.paySalt, 'salt_end_na_appid', true);
    const kvYsd = signWithVariant(payload, cfg.paySalt, 'kv_ysd', true);
    const kvYsdApp = signWithVariant(payload, cfg.paySalt, 'kv_ysd_appid', true);
    const kvSaltEnd = signWithVariant(payload, cfg.paySalt, 'kv_salt_end', true);
    const kvSaltEndApp = signWithVariant(payload, cfg.paySalt, 'kv_salt_end_appid', true);
    const kvSaltEndNa = signWithVariant(payload, cfg.paySalt, 'kv_salt_end_na', true);
    const kvSaltEndNaApp = signWithVariant(payload, cfg.paySalt, 'kv_salt_end_na_appid', true);

    // Additional variants: nosort + token (KV-only)
    const ysdNo = signWithVariant(payload, cfg.paySalt, 'ysd_nosort', true);
    const ysdAppNo = signWithVariant(payload, cfg.paySalt, 'ysd_appid_nosort', true);

    const kvYsdNo = signWithVariant(payload, cfg.paySalt, 'kv_ysd_nosort', true);
    const kvSaltEndNo = signWithVariant(payload, cfg.paySalt, 'kv_salt_end_nosort', true);

    const kvYsdToken = signWithVariant(payload, cfg.paySalt, 'kv_ysd_token', true);
    const kvYsdAppToken = signWithVariant(payload, cfg.paySalt, 'kv_ysd_appid_token', true);
    const kvSaltEndToken = signWithVariant(payload, cfg.paySalt, 'kv_salt_end_token', true);
    const kvSaltEndAppToken = signWithVariant(payload, cfg.paySalt, 'kv_salt_end_appid_token', true);
    const kvSaltEndNaToken = signWithVariant(payload, cfg.paySalt, 'kv_salt_end_na_token', true);
    const kvSaltEndNaAppToken = signWithVariant(payload, cfg.paySalt, 'kv_salt_end_na_appid_token', true);

    res.json({
      ok: true,
      debug: {
        payload,
        salt: cfg.paySalt ? '***' + cfg.paySalt.slice(-4) : 'NOT_SET',
        preorderUrl: cfg.preorderUrl,
        variants: {
          ysd,
          ysd_appid: ysdApp,
          salt_end: saltEnd,
          salt_end_appid: saltEndApp,
          salt_end_na: saltEndNa,
          salt_end_na_appid: saltEndNaApp,
          kv_ysd: kvYsd,
          kv_ysd_appid: kvYsdApp,
          kv_salt_end: kvSaltEnd,
          kv_salt_end_appid: kvSaltEndApp,
          kv_salt_end_na: kvSaltEndNa,
          kv_salt_end_na_appid: kvSaltEndNaApp,
          // nosort variants
          ysd_nosort: ysdNo,
          ysd_appid_nosort: ysdAppNo,
          kv_ysd_nosort: kvYsdNo,
          kv_salt_end_nosort: kvSaltEndNo,
          // token variants (KV only)
          kv_ysd_token: kvYsdToken,
          kv_ysd_appid_token: kvYsdAppToken,
          kv_salt_end_token: kvSaltEndToken,
          kv_salt_end_appid_token: kvSaltEndAppToken,
          kv_salt_end_na_token: kvSaltEndNaToken,
          kv_salt_end_na_appid_token: kvSaltEndNaAppToken
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Minimal auth guard using PREORDER_AUTH_TOKEN
function verifyAuth(req) {
  const token = process.env.PREORDER_AUTH_TOKEN;
  if (!token) return true; // if not set, allow (can tighten later)
  const auth = req.headers['authorization'] || '';
  const match = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return match && match === token;
}

// Helper: build success payload for tt.pay
function buildPayParams({ orderInfo, service }) {
  const svc = Number(process.env.DY_PAY_SERVICE || service || 5) || 5;
  if (typeof orderInfo === 'string') return { orderInfo, service: svc };
  return { orderInfo, service: svc };
}

// MD5 sign for ecpay (严格按照yansongda/pay库实现)
function signWithSaltMD5(body, salt, returnDebugInfo = false) {
  const signData = [];
  const debugLog = [];

  debugLog.push(`[DEBUG] signWithSaltMD5 input: body=${JSON.stringify(body)}, salt=${salt ? '***' + salt.slice(-4) : 'NOT_SET'}`);

  for (const [key, value] of Object.entries(body || {})) {
    debugLog.push(`[DEBUG] Processing field: ${key} = ${value} (type: ${typeof value})`);

    // 排除字段：other_settle_params, app_id, sign, thirdparty_id
    if (['other_settle_params', 'app_id', 'sign', 'thirdparty_id'].includes(key)) {
      debugLog.push(`[DEBUG] Excluding field: ${key}`);
      continue;
    }

    let val = value;

    // 字符串处理：trim
    if (typeof val === 'string') {
      val = val.trim();
    }

    // 跳过空值和'null'字符串 (严格按照PHP逻辑)
    if (!val || val === 'null' || val === '') {
      debugLog.push(`[DEBUG] Skipping empty/null field: ${key} = ${val}`);
      continue;
    }

    // 数组处理（简化版，PHP中有复杂的arrayToString方法）
    if (Array.isArray(val)) {
      val = JSON.stringify(val);
    } else if (typeof val === 'object' && val !== null) {
      val = JSON.stringify(val);
    }

    const finalVal = String(val);
    debugLog.push(`[DEBUG] Adding to signData: ${finalVal}`);
    signData.push(finalVal);
  }

  // 添加salt
  const saltStr = String(salt);
  debugLog.push(`[DEBUG] Adding salt: ${saltStr ? '***' + saltStr.slice(-4) : 'NOT_SET'}`);
  signData.push(saltStr);

  // 按字符串排序 (SORT_STRING)
  signData.sort();
  debugLog.push(`[DEBUG] Sorted signData: [${signData.map(s => `"${s}"`).join(', ')}]`);

  // 用&连接并MD5
  const raw = signData.join('&');
  debugLog.push(`[DEBUG] Raw string for MD5: ${raw}`);

  const signature = crypto.createHash('md5').update(raw, 'utf8').digest('hex');
  debugLog.push(`[DEBUG] Final signature: ${signature}`);

  if (returnDebugInfo) {
    return { signature, debugLog, signData, raw };
  }

  // 输出到控制台（用于服务器日志）
  debugLog.forEach(log => console.log(log));

  return signature;
}

// Helper: collect values for signing (excludes fields per spec)
function collectSignValues(body, { includeAppId = false } = {}) {
  const vals = [];
  for (const [key, value] of Object.entries(body || {})) {
    if (['other_settle_params', 'sign', 'thirdparty_id'].includes(key)) continue;
    if (!includeAppId && key === 'app_id') continue;
    let v = value;
    if (typeof v === 'string') v = v.trim();
    if (!v || v === 'null' || v === '') continue;
    if (Array.isArray(v)) v = JSON.stringify(v);
    else if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
    vals.push(String(v));
  }
  return vals;
}

// Helper: collect key=value pairs for signing (optionally sorted by key)
function collectSignPairs(body, { includeAppId = false, sortByKey = true } = {}) {
  const pairs = [];
  const entries = Object.entries(body || {}).filter(([k]) => {
    if (['other_settle_params', 'sign', 'thirdparty_id'].includes(k)) return false;
    if (!includeAppId && k === 'app_id') return false;
    return true;
  });
  if (sortByKey) entries.sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of entries) {
    let v = value;
    if (typeof v === 'string') v = v.trim();
    if (!v || v === 'null' || v === '') continue;
    if (Array.isArray(v)) v = JSON.stringify(v);
    else if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
    pairs.push(`${key}=${String(v)}`);
  }
  return pairs;
}

// Variant signer: supports value-only and key=value modes; includeAppId via suffix `_appid`; `_nosort` to keep order; `_token` to append &token=salt (KV only)
function signWithVariant(body, salt, variant = 'ysd', returnDebug = false) {
  const saltStr = String(salt ?? '');
  const includeAppId = /_appid$/.test(variant);
  const noSort = /_nosort/.test(variant);
  const tokenMode = /_token/.test(variant);
  const isKV = variant.startsWith('kv_');
  const coreVariant = variant
    .replace(/^kv_/, '')
    .replace(/_appid$/, '')
    .replace(/_nosort$/, '')
    .replace(/_token$/, '');

  const base = isKV
    ? collectSignPairs(body, { includeAppId, sortByKey: !noSort })
    : collectSignValues(body, { includeAppId });

  let raw;
  let signData;

  switch (coreVariant) {
    case 'salt_end': {
      const arr = base.slice();
      if (!isKV && !noSort) arr.sort();
      if (tokenMode && isKV) {
        raw = arr.join('&') + `&token=${saltStr}`;
        signData = arr.concat(['& token=' + saltStr]);
      } else {
        raw = arr.join('&') + '&' + saltStr;
        signData = arr.concat(['& + SALT']);
      }
      break;
    }
    case 'salt_end_na': {
      const arr = base.slice();
      if (!isKV && !noSort) arr.sort();
      if (tokenMode && isKV) {
        raw = arr.join('&') + `&token=${saltStr}`;
        signData = arr.concat(['& token=' + saltStr]);
      } else {
        raw = arr.join('&') + saltStr;
        signData = arr.concat(['+SALT(no-& )']);
      }
      break;
    }
    case 'ysd':
    default: {
      const arr = base.slice();
      if (tokenMode && isKV) {
        // ysd+token (KV): 不把salt参与排序，末尾追加 &token=salt
        raw = arr.join('&') + `&token=${saltStr}`;
        signData = arr.concat(['& token=' + saltStr]);
      } else {
        // ysd：salt 参与排序
        arr.push(saltStr);
        if (!isKV && !noSort) arr.sort();
        signData = arr;
        raw = arr.join('&');
      }
      break;
    }
  }

  const signature = crypto.createHash('md5').update(raw, 'utf8').digest('hex');
  if (returnDebug) return { signature, raw, signData, variant };
  return signature;
}


app.post('/preorder', async (req, res) => {
  if (!verifyAuth(req)) return res.status(401).json({ ok: false, message: 'unauthorized' });

  const { orderNo, amount, openId, anonymousOpenid, appId, notifyUrl, subject, body } = req.body || {};
  if (!orderNo || !amount) return res.status(400).json({ ok: false, message: 'missing orderNo/amount' });

  // Fast path: mock mode for开发/联调占位，不用于生产
  if (String(process.env.GATEWAY_MOCK_MODE || '') === '1') {
    const fake = {
      order_id: orderNo,
      order_token: `MOCK_${Math.random().toString(36).slice(2, 10)}`,
      amount,
      openId,
      appId,
      notifyUrl: notifyUrl || process.env.PAY_NOTIFY_URL,
    };
    return res.json({ ok: true, payParams: buildPayParams({ orderInfo: JSON.stringify(fake), service: 5 }) });
  }

  // Direct-to-担保支付
  const cfg = {
    appId: appId || process.env.DY_PAY_APP_ID || 'tt226e54d3bd581bf801', // 默认使用已知的app_id
    partnerId: process.env.DY_MCH_PARTNER_ID,
    // 某些资料要求使用 salt（支付密钥）进行 MD5 签名
    paySalt: process.env.DY_PAY_SALT,
    preorderUrl: process.env.DY_ECPAY_PRECREATE_URL, // 官方预下单URL（生产/沙盒）
  };

  const missing = Object.entries({
    DY_PAY_APP_ID: cfg.appId,
    DY_MCH_PARTNER_ID: cfg.partnerId,
    DY_ECPAY_PRECREATE_URL: cfg.preorderUrl,
  }).filter(([, v]) => !v).map(([k]) => k);

  if (!cfg.paySalt) missing.push('DY_PAY_SALT');

  if (missing.length) {
    return res.status(400).json({
      ok: false,
      message: 'missing merchant config',
      missing,
      hint: '请在 pay-gateway 服务的环境变量中配置以上缺失项（尤其 DY_PAY_SALT 与 DY_ECPAY_PRECREATE_URL）。',
    });
  }

  try {
    // 依据“担保支付 create_order”常见参数构造请求体（以官方文档为准）
    // 注意：amount 我方上游按“分”传递，接口 total_amount 也要求“分”，故不再 *100
    const payload = {
      app_id: cfg.appId,
      out_order_no: String(orderNo),
      total_amount: Number(amount), // 分
      subject: subject || 'ZhiDao-Order',
      body: body || 'ZhiDao-Pay',
      valid_time: 1800, // 30分钟
      notify_url: notifyUrl || process.env.PAY_NOTIFY_URL,
    };

    // 计算签名（支持多签名变体，便于一次性排查上线切换）
    const variant = String(req.query.variant || (req.body && req.body.variant) || process.env.DY_PAY_SIGN_VARIANT || 'ysd');
    payload.sign = signWithVariant(payload, cfg.paySalt, variant);

    const resp = await fetch(cfg.preorderUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return res.status(502).json({ ok: false, message: 'precreate request failed', status: resp.status, data });
    }

    // 兼容不同返回结构，提取 order_id / order_token
    const maybe = data || {};
    const order_id = maybe.order_id || maybe.data?.order_id || maybe.order?.order_id || maybe.result?.order_id;
    const order_token = maybe.order_token || maybe.data?.order_token || maybe.order?.order_token || maybe.result?.order_token;

    if (!order_id || !order_token) {
      return res.status(500).json({ ok: false, message: 'missing order_id/order_token in response', data });
    }

    const orderInfo = JSON.stringify({ order_id, order_token });
    return res.json({ ok: true, payParams: buildPayParams({ orderInfo, service: 5 }), raw: { order_id } });
  } catch (err) {
    console.error('[preorder] error', err);
    return res.status(500).json({ ok: false, message: 'internal error', error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`[pay-gateway] listening on :${PORT}`);
});
