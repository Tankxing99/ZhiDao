# dev 小流量 AB 执行清单

## 1. 变更前
- 确认当前 dev 环境稳定，无高风险告警
- 备份相关配置（环境变量）、记录当前阈值与监控链接

## 2. 变更项
- 设置环境变量：
  - AB_MODE=hash
  - ENABLE_BAYES_UNC=1
  - ENABLE_MMR=1
  - LAMBDA_UNC=0.2
  - MMR_LAMBDA=0.7
  - TOP_M_FOR_RERANK=50
- 生效范围：先小流量（10%），逐步至 30%/50%

## 3. 观测期（1~2天）
- 后端：/recommendPlants debug.elapsed P50/P95、debug.mmrCostMs分位、debug.fallback占比、debug.ab.bucket分布
- 前端：start_question→adaptive_finish 漏斗、question_next.stepDur分位、adaptive_extra 追加率
- 风险阈值（参考）：elapsed P95<800ms、fallback<5%、mmrCostMs P95<30ms、完成率下降<3%

## 4. 扩大流量/回滚
- 符合阈值：逐步扩大；不符合：立即回滚（AB_MODE清空或关闭 ENABLE_*）
- 每次变更须记录：时间、操作人、参数、截图/链接，写入《开发进度记录.md》

## 5. 收尾
- 输出一页结论：对比指标与决策；沉淀最佳参数到配置建议

