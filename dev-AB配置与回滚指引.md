# dev 环境 A/B 配置与回滚指引

## 1. 目标
- 在 dev 环境以小流量验证 AB_MODE=hash 的一致性分桶，对比 treatment vs control 的关键指标；出现风险时可即时回滚。

## 2. 配置项（后端环境变量）
- AB_MODE=hash
- ENABLE_BAYES_UNC=1
- ENABLE_MMR=1
- LAMBDA_UNC=0.2
- MMR_LAMBDA=0.7
- TOP_M_FOR_RERANK=50

说明：AB_MODE=hash 时，control 桶关闭增强、treatment 桶开启增强；若 AB_MODE 为空则走环境变量策略（不分桶）。

## 3. 验证步骤
- 打开小流量（建议先 10%），观察 1~2 天：
  - debug.ab.bucket 分布
  - debug.elapsed P50/P95、debug.mmrCostMs 分位
  - fallback 占比
  - 页面埋点：complete rate、追加题触发率、总时长P50/P90
- 满足阈值（见埋点指标与看板字典.md）再扩大流量

## 4. 回滚策略
- 关闭 AB：AB_MODE 置空
- 关闭增强：ENABLE_BAYES_UNC=0 或 ENABLE_MMR=0
- 紧急：同时关闭两者，并保留日志以便复盘

## 5. 观测面
- 后端：/recommendPlants 响应 debug（elapsed、fallback、mmrCostMs、ab）
- 前端：start_question、question_next、adaptive_extra、adaptive_finish、adaptive_degrade

## 6. 记录与复盘
- 在《开发进度记录.md》追加每次变更记录；
- 流量扩大/回滚需有时间戳、原因与数据截图/链接；

