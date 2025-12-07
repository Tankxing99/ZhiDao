# pay-gateway (预下单网关 / 抖音担保支付)

- 服务：独立容器，用于统一“预下单”以生成 tt.pay 所需的 orderInfo（service=5 收银台）
- 安全：仅在本服务配置商户密钥，通过 zhidao-api 使用 Bearer Token 调用，主业务服务不持有密钥

## 路由
- GET /healthz
- POST /preorder
  - 鉴权：HTTP Authorization: Bearer ${PREORDER_AUTH_TOKEN}
  - 入参（JSON）：{ orderNo, amount(分), openId, anonymousOpenid, appId, notifyUrl, subject?, body? }
  - 出参（成功）：{ ok:true, payParams:{ orderInfo, service: 5 } }

## 环境变量
- PREORDER_AUTH_TOKEN：来自 zhidao-api 的调用令牌（已在 zhidao-api 配置 PREORDER_PROXY_TOKEN）
- PAY_NOTIFY_URL：缺省回调地址，例如 https://api.iotvision.top/api/shop/payments/notify
- DY_PAY_SERVICE：默认 5（收银台）
- GATEWAY_MOCK_MODE：=1 时返回模拟 orderInfo（仅用于开发占位）

- 直连担保支付所需：
  - DY_PAY_APP_ID（或 client_key）
  - DY_MCH_PARTNER_ID（或 merchant_id/partner_id）
  - DY_MCH_PRIVATE_KEY（PEM 文本）
  - DY_PLATFORM_PUBLIC_KEY（PEM 文本）
  - DY_ECPAY_PRECREATE_URL（官方“预下单”接口 URL）

## 开发说明
当前仅交付直连担保支付的“骨架”：
- 校验缺失项并提示在环境变量配置
- 预留签名与请求实现（避免无依据地硬编码字段与签名体制）
- 收到官方文档链接与签名要求后，补齐 RSA-SHA256 等签名与字段映射，并完善错误处理与幂等策略


