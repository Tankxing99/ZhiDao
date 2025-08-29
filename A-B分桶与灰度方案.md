# A/B 分桶与灰度方案（MVP）

## 1. 分桶策略
- 起步：50/50（Control vs Treatment）
- 粒度：按 openId/anonymousOpenid 一致性哈希
- 灰度：逐步扩大Treatment占比（10% → 30% → 50% → 100%）

## 2. 参数策略
- Control：ENABLE_BAYES_UNC=0，ENABLE_MMR=0
- Treatment：ENABLE_BAYES_UNC=1（LAMBDA_UNC=0.2），ENABLE_MMR=1（MMR_LAMBDA=0.7，TOP_M_FOR_RERANK=50）

## 3. 验证指标
- 问卷：完成率、追加题触发率、总时长P50/P90
- 推荐：CTR@rec、二跳（收藏/加购）、回访率
- 风险：接口P95、fallback率、不安全曝光率

## 4. 决策阈值
- NDCG@5（离线代理）≥ +5%
- 完成率下降 < 3%
- CTR@rec ≥ +3%
- 风险指标不过阈值（接口P95<800ms、不安全曝光率<0.1‰）

## 5. 落地建议
- 在后端按用户哈希决定开关（或由前端透传模式）；
- 响应debug附带当前开关、桶ID，便于日志关联；
- 分阶段观察与留验期，必要时自动降级（关闭MMR或提高LAMBDA_UNC）。

