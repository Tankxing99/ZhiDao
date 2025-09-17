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
    const saltEnd = signWithVariant(payload, cfg.paySalt, 'salt_end', true);
    const saltEndNa = signWithVariant(payload, cfg.paySalt, 'salt_end_na', true);

    res.json({
      ok: true,
      debug: {
        payload,
        salt: cfg.paySalt ? '***' + cfg.paySalt.slice(-4) : 'NOT_SET',
        preorderUrl: cfg.preorderUrl,
        variants: {
          ysd,
          salt_end: saltEnd,
          salt_end_na: saltEndNa
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
function collectSignValues(body) {
  const vals = [];
  for (const [key, value] of Object.entries(body || {})) {
    if (['other_settle_params', 'app_id', 'sign', 'thirdparty_id'].includes(key)) continue;
    let v = value;
    if (typeof v === 'string') v = v.trim();
    if (!v || v === 'null' || v === '') continue;
    if (Array.isArray(v)) v = JSON.stringify(v);
    else if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
    vals.push(String(v));
  }
  return vals;
}

// Variant signer: ysd (salt participates sorting), salt_end (& + salt), salt_end_na (& then no ampersand before salt)
function signWithVariant(body, salt, variant = 'ysd', returnDebug = false) {
  const values = collectSignValues(body);
  const saltStr = String(salt ?? '');
  let raw;
  let signData;

  switch (variant) {
    case 'salt_end': {
      const sorted = values.slice().sort();
      raw = sorted.join('&') + '&' + saltStr;
      signData = sorted.concat([`& + SALT`]);
      break;
    }
    case 'salt_end_na': {
      const sorted = values.slice().sort();
      raw = sorted.join('&') + saltStr;
      signData = sorted.concat([`+SALT(no-&)`]);
      break;
    }
    case 'ysd':
    default: {
      const arr = values.slice();
      arr.push(saltStr);
      arr.sort();
      signData = arr;
      raw = arr.join('&');
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
