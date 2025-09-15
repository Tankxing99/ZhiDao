# 支付回调验签配置说明（抖音担保支付）

本文描述 server/zhidao-api 回调验签所需的云端环境变量与配置要点。

## 环境变量

- DISABLE_SIGNATURE_VERIFY
  - 说明：回调连通性灰度开关。1=关闭验签（仅用于连通性验证）；0=开启验签（默认目标）。
  - 示例：1（灰度）/ 0（正式）

- DY_PAY_PLATFORM_PUBLIC_KEY
  - 说明：抖音平台公钥（PEM 文本，包含 `-----BEGIN PUBLIC KEY-----`）。用于验证 Byte-Signature。
  - 注意：这里使用“平台公钥”，不是“应用公钥”。
  - 二选一：与下方 DY_PAY_PLATFORM_PUBLIC_KEY_PATH 只需配置一个。

- DY_PAY_PLATFORM_PUBLIC_KEY_PATH
  - 说明：平台公钥 PEM 文件的绝对路径（云环境可挂载机密或配置文件）。
  - 二选一：与上方 DY_PAY_PLATFORM_PUBLIC_KEY 只需配置一个。

（预留）可选：
- DY_PAY_TOKEN / DY_PAY_SALT
  - 说明：若后续官方文档要求使用 Token/SALT 参与签名，可通过以上变量注入；当前回调验签实现基于平台公钥 RSA-SHA256，不依赖二者。

## 验签逻辑（实现摘要）
- 头部字段（大小写不敏感）：
  - Byte-Signature、Byte-Timestamp、Byte-Nonce-Str
- 签名原文：`timestamp + "\n" + nonce + "\n" + rawBody + "\n"`
  - rawBody 为收到的请求原文（Express 使用 `express.json({ verify })` 捕获）
- 算法：RSA-SHA256，使用平台公钥验证签名是否匹配

## 变更位置
- 捕获原始请求体：server/zhidao-api/src/index.js（express.json verify）
- 验签实现：server/zhidao-api/src/lib/shop-signature.js
- 回调路由：server/zhidao-api/src/shop/payments.routes.js

## 配置步骤（云端）
1. 在“配置/环境变量”增加：
   - DISABLE_SIGNATURE_VERIFY=1（灰度）
   - DY_PAY_PLATFORM_PUBLIC_KEY=（粘贴 PEM 文本）或 DY_PAY_PLATFORM_PUBLIC_KEY_PATH=/path/to/platform_public.pem
2. 重新部署/重启服务
3. 用联调后台触发模拟通知，期望 200 且入库 `payments_notify_raw`
4. 验证通过后：将 DISABLE_SIGNATURE_VERIFY=0，重新部署

## 风险与建议
- 切勿将公钥/私钥等机密写入仓库；使用环境变量或机密管理
- 验签失败时仍会入库原文，便于排障；业务更新应在验签通过后执行
- 确保 `Content-Type: application/json`，避免 body-parser 解析异常

