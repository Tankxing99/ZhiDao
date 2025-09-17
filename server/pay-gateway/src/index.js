import express from 'express';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 8000;

// capture raw body if needed in future (e.g., signature)
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', (req, res) => {
  res.json({ ok: true, ts: Date.now(), service: 'pay-gateway' });
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

// MD5 sign for ecpay (基于yansongda/pay库的正确实现)
function signWithSaltMD5(body, salt) {
  const signData = [];

  for (const [key, value] of Object.entries(body || {})) {
    // 排除字段：other_settle_params, app_id, sign, thirdparty_id
    if (['other_settle_params', 'app_id', 'sign', 'thirdparty_id'].includes(key)) {
      continue;
    }

    let val = value;

    // 字符串处理：trim
    if (typeof val === 'string') {
      val = val.trim();
    }

    // 跳过空值和'null'字符串
    if (!val || val === 'null' || val === '') {
      continue;
    }

    // 数组处理（如果需要的话，这里简化处理）
    if (Array.isArray(val)) {
      val = JSON.stringify(val);
    } else if (typeof val === 'object') {
      val = JSON.stringify(val);
    }

    signData.push(String(val));
  }

  // 添加salt
  signData.push(String(salt));

  // 按字符串排序
  signData.sort();

  // 用&连接并MD5
  const raw = signData.join('&');
  return crypto.createHash('md5').update(raw, 'utf8').digest('hex');
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
    appId: appId || process.env.DY_PAY_APP_ID,
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

    // 计算签名（基于yansongda/pay库的正确实现）
    payload.sign = signWithSaltMD5(payload, cfg.paySalt);

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
