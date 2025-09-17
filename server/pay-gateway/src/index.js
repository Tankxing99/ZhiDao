import express from 'express';

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

  // Direct-to-担保支付（待配置正式商户参数）
  const cfg = {
    appId: appId || process.env.DY_PAY_APP_ID,
    partnerId: process.env.DY_MCH_PARTNER_ID,
    mchPrivateKey: process.env.DY_MCH_PRIVATE_KEY, // PEM
    platformPublicKey: process.env.DY_PLATFORM_PUBLIC_KEY, // PEM
    preorderUrl: process.env.DY_ECPAY_PRECREATE_URL, // 强烈建议通过环境变量提供官方预下单URL
  };

  const missing = Object.entries({
    DY_PAY_APP_ID: cfg.appId,
    DY_MCH_PARTNER_ID: cfg.partnerId,
    DY_MCH_PRIVATE_KEY: cfg.mchPrivateKey,
    DY_PLATFORM_PUBLIC_KEY: cfg.platformPublicKey,
    DY_ECPAY_PRECREATE_URL: cfg.preorderUrl,
  }).filter(([, v]) => !v).map(([k]) => k);

  if (missing.length) {
    return res.status(400).json({
      ok: false,
      message: 'missing merchant config',
      missing,
      hint: '请在 pay-gateway 服务的环境变量中配置以上缺失项；配置完成后即可直连担保支付预下单。',
    });
  }

  try {
    // 说明：此处为直连担保支付“预下单”调用的骨架。具体签名体与字段需严格参考官方文档。
    // 为避免错误实现，这里保留请求骨架与透传结构，待你提供正式文档链接/签名体制后再补充实现。

    const payload = {
      // 常见字段示例（以官方文档为准）：
      // app_id: cfg.appId,
      // out_order_no: orderNo,
      // total_amount: amount,
      // subject: subject || 'ZhiDao-Order',
      // body: body || 'ZhiDao-Test-Pay',
      // valid_time: 300,
      // notify_url: notifyUrl || process.env.PAY_NOTIFY_URL,
      // sign, sign_type, timestamp, etc...
    };

    // TODO: 构造签名与HTTP请求（RSA-SHA256 等），并解析返回 { orderInfo, service }
    // const resp = await fetch(cfg.preorderUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    // const data = await resp.json();
    // 示例：根据返回结构提取 orderInfo
    // const orderInfo = data?.orderInfo || data?.data?.orderInfo || data?.payParams?.orderInfo;

    return res.status(501).json({
      ok: false,
      message: 'direct ecpay preorder not implemented yet in scaffold',
      next: '请提供担保支付预下单官方文档链接与签名字段明细；我将补齐签名与请求实现并上线',
    });
  } catch (err) {
    console.error('[preorder] error', err);
    return res.status(500).json({ ok: false, message: 'internal error', error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`[pay-gateway] listening on :${PORT}`);
});

