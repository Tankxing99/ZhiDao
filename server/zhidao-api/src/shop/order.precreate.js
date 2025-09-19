// order.precreate.js
// 测试支付功能 - 预下单适配层（选法2：服务端真实预下单，优先走“代理网关”以避免在本服务中持有商户密钥）
// 说明：
// - 优先从环境变量读取 PREORDER_PROXY_URL（商户/网关自有预下单接口）进行预下单
// - 该“网关”负责与抖音支付/担保交易/聚合收银台等产品线的真实对接与签名，返回 tt.pay 可直接使用的参数
// - 本服务不落地商户密钥，降低安全风险；若后续需要直连官方接口，可在此文件新增 direct-bytesdk 分支

import https from 'https';

function httpPostJson(urlString, data, headers = {}){
  return new Promise((resolve, reject) => {
    try{
      const url = new URL(urlString);
      const payload = Buffer.from(JSON.stringify(data));
      const options = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        headers: {
          'content-type': 'application/json',
          'content-length': payload.length,
          ...headers,
        },
      };
      const req = https.request(options, (res) => {
        let chunks = [];
        res.on('data', d => chunks.push(d));
        res.on('end', () => {
          const buf = Buffer.concat(chunks).toString('utf8');
          try{ resolve({ statusCode: res.statusCode || 0, data: JSON.parse(buf) }); }
          catch(_){ resolve({ statusCode: res.statusCode || 0, data: buf }); }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    }catch(e){ reject(e); }
  });
}

export async function precreateOrderViaProxy({ orderNo, amount, ctxInfo, notifyUrl, appId }){
  const proxyUrl = process.env.PREORDER_PROXY_URL; // 由你方/商户网关提供的预下单接口地址
  if (!proxyUrl) return { ok: false, message: 'PREORDER_PROXY_URL 未配置' };

  // 可选网关鉴权
  const authToken = process.env.PREORDER_PROXY_TOKEN; // 可选：Bearer Token
  const headers = {};
  if (authToken) headers['authorization'] = `Bearer ${authToken}`;

  const payload = {
    orderNo,
    amount, // 分
    openId: ctxInfo?.openId,
    anonymousOpenid: ctxInfo?.anonymousOpenid,
    appId: appId || process.env.BYTEDANCE_APP_ID || process.env.TT_APPID || '',
    notifyUrl: notifyUrl || process.env.PAY_NOTIFY_URL || 'https://api.iotvision.top/api/shop/payments/notify',
    // 其他需要透传给网关的字段可在此补充：商品信息、subject、body 等
  };

  const { statusCode, data } = await httpPostJson(proxyUrl, payload, headers);
  if (statusCode !== 200) return { ok: false, message: `proxy http ${statusCode}`, raw: data };

  // 约定网关返回：
  // 1) { ok:true, payParams:{ orderInfo: string|object, service: 5, ... } }
  // 或 2) { orderInfo: string|object, service: 5 }
  // 或 3) { ok:true, data:{ orderInfo, service } }
  let payParams = null;
  if (data && typeof data === 'object'){
    if (data.ok && data.payParams) payParams = data.payParams;
    else if (data.ok && data.data && (data.data.orderInfo || data.data.payParams)) payParams = data.data.payParams || { orderInfo: data.data.orderInfo, service: data.data.service };
    else if (data.orderInfo || data.payParams) payParams = data.payParams || { orderInfo: data.orderInfo, service: data.service };
  }

  if (!payParams) return { ok:false, message: 'proxy result missing payParams/orderInfo', raw: data };
  return { ok:true, payParams };
}

