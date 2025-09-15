// shop/payments.routes.js
// 商城域-支付回调路由（最小可用占位版）：记录原始通知、占位验签、快速应答

import { dySDK } from '@open-dy/node-server-sdk';
import { verifyPaymentNotify, verifyRefundNotify, pickOrderNo } from '../lib/shop-signature.js';

function log(...args){ try{ console.log('[shop/payments]', ...args); }catch(_){} }
function warn(...args){ try{ console.warn('[shop/payments]', ...args); }catch(_){} }

export function registerShopPaymentRoutes(app){
  // 支付结果回调通知（担保支付）
  app.post('/api/shop/payments/notify', async (req, res) => {
    const headers = req.headers || {};
    const body = req.body || {};

    // 验签（占位/可禁用）
    const verify = verifyPaymentNotify({ headers, body });
    if (!verify.ok) {
      warn('verifyPaymentNotify failed:', verify);
    }

    // 入库原始回调（便于排障与幂等处理）
    let stored = false;
    const orderNo = pickOrderNo(body);
    try{
      const db = dySDK.database();
      await db.collection('payments_notify_raw').add({
        orderNo: orderNo || undefined,
        headers,
        body,
        verified: verify.ok,
        verifyMode: verify.mode || 'unknown',
        createdAt: Date.now()
      });
      stored = true;
    }catch(e){ warn('persist notify failed:', e?.message || e); }

    // TODO：后续接入订单状态流转与幂等（orderNo+openId）
    log('payment notify received', { orderNo, stored, verify: verify.mode || verify.ok });

    // 必须快速200应答
    res.status(200).send('success');
  });

  // 退款回调（可选）
  app.post('/api/shop/refunds/notify', async (req, res) => {
    const headers = req.headers || {};
    const body = req.body || {};
    const verify = verifyRefundNotify({ headers, body });
    if (!verify.ok) {
      warn('verifyRefundNotify failed:', verify);
    }

    let stored = false;
    const orderNo = pickOrderNo(body);
    try{
      const db = dySDK.database();
      await db.collection('refunds_notify_raw').add({
        orderNo: orderNo || undefined,
        headers,
        body,
        verified: verify.ok,
        verifyMode: verify.mode || 'unknown',
        createdAt: Date.now()
      });
      stored = true;
    }catch(e){ warn('persist refund notify failed:', e?.message || e); }

    log('refund notify received', { orderNo, stored, verify: verify.mode || verify.ok });
    res.status(200).send('success');
  });
}

