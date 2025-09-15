// shop-signature.js
// 占位版验签模块：用于担保支付/回调联调阶段快速打通链路
// 说明：
// - 抖音担保支付的通知验签以官方文档为准，此处仅提供占位实现与开关；
// - 当 DISABLE_SIGNATURE_VERIFY=1 时，直接通过验签（联调期使用）；
// - 否则返回“未实现”但不会阻断回调入库，便于我们先验证连通性。
// - 请在完成商户密钥与签名算法确认后，替换 verifyPaymentNotify/verifyRefundNotify 的实现。

export function verifyPaymentNotify(ctx) {
  try {
    if ((process.env.DISABLE_SIGNATURE_VERIFY || '0') === '1') {
      return { ok: true, mode: 'disabled' };
    }
    // TODO: 根据抖音担保支付官方文档实现：
    // 1) 从 headers 读取签名相关字段
    // 2) 结合商户密钥/证书、请求体计算签名
    // 3) 比对并返回 ok
    return { ok: true, mode: 'placeholder' };
  } catch (e) {
    return { ok: false, reason: e?.message || String(e) };
  }
}

export function verifyRefundNotify(ctx) {
  try {
    if ((process.env.DISABLE_SIGNATURE_VERIFY || '0') === '1') {
      return { ok: true, mode: 'disabled' };
    }
    return { ok: true, mode: 'placeholder' };
  } catch (e) {
    return { ok: false, reason: e?.message || String(e) };
  }
}

export function pickOrderNo(body) {
  try {
    return (
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

