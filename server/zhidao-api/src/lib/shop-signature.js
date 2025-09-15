// shop-signature.js
// 抖音小程序担保支付-回调验签实现（基于官方“回调签名算法”）
// 参考：
// - 支付结果回调（官方文档）：https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/server/ecpay/pay-list/callback
// - 接入准备/回调签名算法（官方文档）：https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/open-capacity/guaranteed-payment/TE
// 要点：
// - 平台回调通过头部 Byte-Signature / Byte-Timestamp / Byte-Nonce-Str 传递签名要素
// - 验签串格式：`${timestamp}\n${nonce}\n${rawBody}\n`
// - 验签算法：RSA-SHA256（使用“平台公钥”验证；注意非应用公钥）
// - 原始请求体（rawBody）必须是接收到的原文，不能二次序列化/格式化

import fs from 'fs';
import crypto from 'crypto';

function readEnv(name, defVal = '') { return (process.env[name] ?? defVal) + ''; }

function loadPlatformPublicKey() {
  // 支持两种方式：
  // 1) DY_PAY_PLATFORM_PUBLIC_KEY：直接放置 PEM 文本（含 -----BEGIN PUBLIC KEY-----）
  // 2) DY_PAY_PLATFORM_PUBLIC_KEY_PATH：指向 PEM 文件路径
  const pemInline = readEnv('DY_PAY_PLATFORM_PUBLIC_KEY', '').trim();
  if (pemInline) return pemInline;
  const pemPath = readEnv('DY_PAY_PLATFORM_PUBLIC_KEY_PATH', '').trim();
  if (pemPath && fs.existsSync(pemPath)) {
    return fs.readFileSync(pemPath, 'utf8');
  }
  return '';
}

function getHeaderCaseInsensitive(headers, key) {
  if (!headers) return '';
  const found = Object.keys(headers).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? headers[found] : '';
}

function buildSignPayload(timestamp, nonce, rawBody) {
  return `${timestamp}\n${nonce}\n${rawBody || ''}\n`;
}

function verifySignatureRSA256({ timestamp, nonce, rawBody, signatureBase64, platformPublicKey }) {
  if (!timestamp || !nonce || !signatureBase64 || !platformPublicKey) {
    return { ok: false, reason: 'missing-params' };
  }
  const payload = buildSignPayload(timestamp, nonce, rawBody || '');
  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(Buffer.from(payload, 'utf8'));
    verifier.end();
    const ok = verifier.verify(platformPublicKey, Buffer.from(signatureBase64, 'base64'));
    return { ok, mode: 'rsa-sha256', payloadPreview: payload.slice(0, 120) };
  } catch (e) {
    return { ok: false, reason: e?.message || String(e) };
  }
}

export function verifyPaymentNotify(ctx) {
  try {
    if ((process.env.DISABLE_SIGNATURE_VERIFY || '0') === '1') {
      return { ok: true, mode: 'disabled' };
    }
    const headers = ctx?.headers || {};
    // 官方约定头（大小写可能不同，这里不区分大小写）
    const signature = getHeaderCaseInsensitive(headers, 'Byte-Signature');
    const timestamp = getHeaderCaseInsensitive(headers, 'Byte-Timestamp');
    const nonceStr = getHeaderCaseInsensitive(headers, 'Byte-Nonce-Str');
    const rawBody = ctx?.rawBody || (ctx?.body ? JSON.stringify(ctx.body) : '');

    const platformPublicKey = loadPlatformPublicKey();
    if (!platformPublicKey) {
      return { ok: false, reason: 'platform-public-key-missing' };
    }
    return verifySignatureRSA256({ timestamp, nonce: nonceStr, rawBody, signatureBase64: signature, platformPublicKey });
  } catch (e) {
    return { ok: false, reason: e?.message || String(e) };
  }
}

export function verifyRefundNotify(ctx) {
  try {
    if ((process.env.DISABLE_SIGNATURE_VERIFY || '0') === '1') {
      return { ok: true, mode: 'disabled' };
    }
    const headers = ctx?.headers || {};
    const signature = getHeaderCaseInsensitive(headers, 'Byte-Signature');
    const timestamp = getHeaderCaseInsensitive(headers, 'Byte-Timestamp');
    const nonceStr = getHeaderCaseInsensitive(headers, 'Byte-Nonce-Str');
    const rawBody = ctx?.rawBody || (ctx?.body ? JSON.stringify(ctx.body) : '');

    const platformPublicKey = loadPlatformPublicKey();
    if (!platformPublicKey) {
      return { ok: false, reason: 'platform-public-key-missing' };
    }
    return verifySignatureRSA256({ timestamp, nonce: nonceStr, rawBody, signatureBase64: signature, platformPublicKey });
  } catch (e) {
    return { ok: false, reason: e?.message || String(e) };
  }
}

export function pickOrderNo(body) {
  try {
    // 抖音回调常见格式：{ version, msg, type }，其中 msg 为 JSON 字符串
    // 这里做宽松解析：若存在 msg 字段，则尝试解析其中的 out_order_no
    if (body?.msg && typeof body.msg === 'string') {
      try {
        const m = JSON.parse(body.msg);
        return m?.out_order_no || m?.orderNo || m?.order_no || null;
      } catch (_) { /* ignore */ }
    }
    return (
      body?.out_order_no ||
      body?.orderNo ||
      body?.order_no ||
      body?.data?.orderNo ||
      body?.data?.order_no ||
      body?.order?.orderNo ||
      body?.order?.order_no ||
      null
    );
  } catch (_) { return null; }
}
