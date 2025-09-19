// shop/payments.routes.js
// 商城域-支付回调路由（最小可用占位版）：记录原始通知、占位验签、快速应答

import { dySDK } from '@open-dy/node-server-sdk';
import { verifyPaymentNotify, verifyRefundNotify, pickOrderNo } from '../lib/shop-signature.js';
import { precreateOrderViaProxy } from './order.precreate.js';
import { queryOrderGeneral } from './order.query.js';

import crypto from 'crypto';
import fs from 'fs';

function log(...args){ try{ console.log('[shop/payments]', ...args); }catch(_){} }
function warn(...args){ try{ console.warn('[shop/payments]', ...args); }catch(_){} }

export function registerShopPaymentRoutes(app){
  // 通用交易系统：requestOrder 参数生成（服务端）
  // 说明：
  // - 严格依据官方 basicapi 要求，data 与 byteAuthorization 必须由“开发者服务端”生成并下发；前端不得改动
  // - 本实现保守：仅构造 data 字符串；byteAuthorization 的生成需按官方签名规范实现。为避免臆测，P0 提供两种方式：
  //   A) 测试占位：通过环境变量 BYTE_AUTHORIZATION_STATIC 注入；
  //   B) 正式实现：提供 APP_PRIVATE_KEY 或 APP_PRIVATE_KEY_PATH 与官方签名规则后再启用
  app.post('/api/shop/general/requestOrder', async (req, res) => {
    try{
      const body = req.body || {};
      // 入参严格以官方示例为参考；此处不做字段转换，仅做存在性校验
      const orderEntrySchema = body.orderEntrySchema || undefined;
      const skuList = Array.isArray(body.skuList) ? body.skuList : undefined;
      const outOrderNo = body.outOrderNo ? String(body.outOrderNo) : '';
      const totalAmount = Number(body.totalAmount || 0);
      const payExpireSeconds = body.payExpireSeconds != null ? Number(body.payExpireSeconds) : undefined;
      const limitPayWayList = Array.isArray(body.limitPayWayList) ? body.limitPayWayList : undefined;

      if (!outOrderNo || !totalAmount || !skuList) {
        return res.status(400).json({ ok:false, message:'缺少必要字段：outOrderNo/totalAmount/skuList（字段以官方 basicapi 为准）' });
      }

      // 严格由服务端生成 data（字符串）；前端不得改动
      const dataObj = { orderEntrySchema, skuList, outOrderNo, totalAmount };
      if (payExpireSeconds != null) dataObj.payExpireSeconds = payExpireSeconds;
      if (limitPayWayList) dataObj.limitPayWayList = limitPayWayList;
      const dataStr = JSON.stringify(dataObj);

      // byteAuthorization 生成策略：
      // - P0：允许通过 BYTE_AUTHORIZATION_STATIC 注入占位值以完成联调流程
      // - 正式：需按官方签名规范用“应用私钥”计算（APP_PRIVATE_KEY/_PATH），此处不臆测实现
      const staticAuth = process.env.BYTE_AUTHORIZATION_STATIC || '';
      if (staticAuth) {
        return res.status(200).json({ ok:true, data: dataStr, byteAuthorization: staticAuth, mode:'static' });
      }

      const hasPrivKey = !!(process.env.APP_PRIVATE_KEY || process.env.APP_PRIVATE_KEY_PATH);
      if (!hasPrivKey) {
        return res.status(200).json({
          ok:false,
          message:'尚未配置应用私钥以生成 byteAuthorization',
          hint:'请在部署环境设置 APP_PRIVATE_KEY 或 APP_PRIVATE_KEY_PATH，并提供官方 basicapi 签名规则后再启用正式生成。临时可设置 BYTE_AUTHORIZATION_STATIC 进行流程联调。',
          data: dataStr
        });
      }

      // 正式签名实现：
      const appId = process.env.BYTEDANCE_APP_ID || process.env.TT_APPID || process.env.DY_PAY_APP_ID || '';
      const keyVersion = process.env.BYTEDANCE_PUBLIC_KEY_VERSION || process.env.APP_PUBLIC_KEY_VERSION || process.env.KEY_VERSION || '';
      const signPath = process.env.DY_GENERAL_TRADE_REQUEST_PATH || process.env.REQUEST_ORDER_PATH || process.env.BYTE_SIGN_PATH || '/requestOrder';
      if (!appId || !keyVersion) {
        return res.status(200).json({
          ok: false,
          message: '缺少 appId 或 keyVersion 配置，无法生成 byteAuthorization',
          hint: '请设置环境变量：BYTEDANCE_APP_ID(TT_APPID) 与 KEY_VERSION（或 APP_PUBLIC_KEY_VERSION）。接口路径默认使用 /requestOrder（来源：官方 tt.requestOrder 文档）。',
          data: dataStr
        });
      }
      let privateKey = process.env.APP_PRIVATE_KEY || '';
      if (!privateKey && process.env.APP_PRIVATE_KEY_PATH) {
        try { privateKey = fs.readFileSync(process.env.APP_PRIVATE_KEY_PATH, 'utf8'); } catch(e) {}
      }
      if (!privateKey) {
        return res.status(200).json({ ok:false, message:'APP 私钥读取失败', hint:'请配置 APP_PRIVATE_KEY 或 APP_PRIVATE_KEY_PATH', data: dataStr });
      }
      const timestamp = Math.floor(Date.now()/1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');
      const toSign = `POST\n${signPath}\n${timestamp}\n${nonce}\n${dataStr}\n`;
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(toSign, 'utf8');
      const signature = signer.sign(privateKey, 'base64');
      const byteAuthorization = `SHA256-RSA2048 appid=${appId},nonce_str=${nonce},timestamp=${timestamp},key_version=${keyVersion},signature=${signature}`;
      return res.status(200).json({ ok:true, data: dataStr, byteAuthorization, mode: 'rsa2048' });
    }catch(e){
      warn('general requestOrder failed:', e?.message || e);
      return res.status(500).json({ ok:false, message: 'internal error' });
    }
  });

  // 统一下单（测试支付功能）
  // req: { productId?: string, amount?: number } // 金额单位：分
  // resp: { ok: true, orderNo: string, payParams?: Object, hint?: string }
  app.post('/api/shop/orders', async (req, res) => {
    try{
      const headers = req.headers || {};
      const body = req.body || {};
      const amount = Math.max(1, Number(body.amount || 1)); // 默认1分
      const productId = body.productId || 'test-plant-001';
      const orderNo = `TEST${Date.now()}`;

      // 尝试获取用户上下文（openId/anonymousOpenid），便于后续对齐交易系统参数
      let ctxInfo = {};
      try{
        const serviceCtx = dySDK.context({ headers });
        const ctx = serviceCtx.getContext();
        ctxInfo = { openId: ctx?.openId, anonymousOpenid: ctx?.anonymousOpenid };
      }catch(_){ /* ignore */ }

      // 记录测试订单（便于排障）
      try{
        const db = dySDK.database();
        await db.collection('orders_test').add({
          orderNo, productId, amount, status: 'created',
          ctx: ctxInfo,
          createdAt: Date.now()
        });
      }catch(e){ warn('persist test order failed:', e?.message || e); }

      // 优先：真实预下单（代理网关模式）
      let payParams = null;
      try{
        const notifyUrl = process.env.PAY_NOTIFY_URL || 'https://api.iotvision.top/api/shop/payments/notify';
        const appId = process.env.BYTEDANCE_APP_ID || process.env.TT_APPID || '';
        const proxy = await precreateOrderViaProxy({ orderNo, amount, ctxInfo, notifyUrl, appId });
        if (proxy && proxy.ok && proxy.payParams) payParams = proxy.payParams;
      }catch(e){ warn('precreate via proxy failed:', e?.message || e); }

      // 联调阶段兜底：从环境变量读取静态 tt.pay 参数
      if (!payParams) {
        const rawParams = process.env.TEST_TT_PAY_PARAMS;
        if (rawParams) {
          try{ payParams = JSON.parse(rawParams); }catch(e){ warn('parse TEST_TT_PAY_PARAMS failed:', e?.message || e); }
        }
        if (!payParams && process.env.TEST_TT_ORDERINFO) {
          payParams = { orderInfo: process.env.TEST_TT_ORDERINFO };
          if (process.env.TEST_TT_PAY_SERVICE) payParams.service = process.env.TEST_TT_PAY_SERVICE;
        }
      }

      if (!payParams) {
        const hint = '后端尚未接入真实“预下单”或未配置 TEST_TT_PAY_PARAMS/TEST_TT_ORDERINFO，暂无法返回 tt.pay 所需参数。建议：配置 PREORDER_PROXY_URL（推荐）或完成官方预下单并返回 orderInfo。';
        return res.status(200).json({ ok: true, orderNo, hint });
      }

      return res.status(200).json({ ok: true, orderNo, payParams });
    }catch(e){
      warn('create test order failed:', e?.message || e);
      return res.status(500).json({ ok:false, message: e?.message || 'create order failed' });
    }
  });
  // 支付结果回调通知（担保支付）
  app.post('/api/shop/payments/notify', async (req, res) => {
    const headers = req.headers || {};
    const body = req.body || {};

    // 验签（占位/可禁用）
    const verify = verifyPaymentNotify({ headers, body, rawBody: req.rawBody });
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
    const verify = verifyRefundNotify({ headers, body, rawBody: req.rawBody });
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

  // 订单查询兜底（通用交易系统建议：回调可能延迟/丢失 → 主动查询作为最终判定依据）
  // GET /api/shop/orders/:orderNo/confirm?force=1
  // 返回：{ ok: boolean, orderNo, status?: string, raw?: any, hint?: string }
  app.get('/api/shop/orders/:orderNo/confirm', async (req, res) => {
    try {
      const orderNo = String(req.params.orderNo || '').trim();
      if (!orderNo) return res.status(400).json({ ok: false, message: 'missing orderNo' });

      // 统一走适配器（依据官方文档配置具体查询实现；未配置则返回提示，不做臆测）
      const result = await queryOrderGeneral({ orderNo });
      // 将查询结果记录到集合（可选），便于审计
      try {
        const db = dySDK.database();
        await db.collection('orders_query_log').add({
          orderNo,
          result,
          from: 'confirm-endpoint',
          createdAt: Date.now(),
        });
      } catch (_) {}

      if (!result || !result.ok) {
        return res.status(200).json({ ok: false, orderNo, hint: result?.hint || '未配置查询适配器或上游未返回成功。请参照官方“通用交易系统 接入指引”配置查询接口。' });
      }
      return res.status(200).json({ ok: true, orderNo, status: result.status || 'unknown', raw: result.raw });
    } catch (e) {
      warn('order confirm failed:', e?.message || e);
      return res.status(500).json({ ok: false, message: 'order confirm error' });
    }
  });

}

