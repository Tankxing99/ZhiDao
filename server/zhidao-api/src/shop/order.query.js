// order.query.js
// 通用交易系统-订单查询兜底适配器（P0占位实现）
// 说明：
// - 官方最佳实践：支付结果回调可能延迟/丢失 → 建议接入“查询订单信息”接口作为最终判定依据
// - 文档参考（通用交易系统 接入指引/调用时序）：
//   https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/open-capacity/business-monetization/guaranteed-payment/general/basicapi
// - 为避免臆测参数与接口路径，本文件默认不直连平台接口；请在 P1/P2 阶段按所用产品线文档补齐直连实现。

export async function queryOrderGeneral({ orderNo }) {
  try {
    // 读取可选的“上游查询网关”配置（若你有自建网关/统一查询服务，可在此透传）
    const url = process.env.ORDER_QUERY_URL || '';
    const token = process.env.ORDER_QUERY_TOKEN || '';

    if (!url) {
      return {
        ok: false,
        hint:
          '未配置 ORDER_QUERY_URL；为避免臆测，请按官方通用交易系统接入指引确认查询接口与入参后再接入。',
      };
    }

    // 注意：以下为“占位透传”示例；具体字段名与签名规则必须以官方文档为准
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ orderNo }),
    });

    const rawText = await resp.text();
    let data; try { data = JSON.parse(rawText); } catch (_) {}

    if (!resp.ok) {
      return { ok: false, hint: '上游查询网关返回非200', raw: rawText || data };
    }

    // 这里不猜测状态字段；原样返回以便上层判断/记录
    return { ok: true, raw: data ?? rawText, status: (data && (data.status || data.trade_state)) || undefined };
  } catch (e) {
    return { ok: false, hint: e?.message || String(e) };
  }
}

