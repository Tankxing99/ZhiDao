# 植物百科知识库——数据收集与处理记录（首版）

更新时间：2025-08-15

## 数据源
- GitHub: PlantFlowerDatasets（优先数据源）
  - 仓库：https://github.com/Tankxing99/PlantFlowerDatasets
  - 说明：包含花卉/养护语料以及中国植物志文本（bin/idx 训练格式）。本次未直接解析 bin/idx，仅作为物种学名与文本参考。
- 维基百科（物种信息、形态与用途、毒性参考/外部链接）
  - Dracaena trifasciata：https://en.wikipedia.org/wiki/Dracaena_trifasciata
  - Epipremnum aureum：https://en.wikipedia.org/wiki/Epipremnum_aureum
  - Ficus lyrata：https://en.wikipedia.org/wiki/Ficus_lyrata
- Kew POWO（权威学名校验与分类）：https://powo.science.kew.org/
- ASPCA（宠物毒性）：https://www.aspca.org/pet-care/animal-poison-control
- NCSU Extension（园艺与养护通识）：https://plants.ces.ncsu.edu/

## 目标与适配
- 目标：支持问卷推荐（light/space/level），提升专业性：学名、同物异名、分类、特征、原产地/生境、环境偏好、养护、用途、毒性。
- 适配：与 utils/recommend.js 的标签一致（light/space/level ∈ {low|medium|high}/{small|medium|large}/{beginner|intermediate|expert}）。

## 数据结构（JSON Schema 摘要）
- 根字段：version、schema_version、updatedAt、schema、plants[]
- plants[*] 关键字段：
  - id（slug）、scientific_name、common_names.zh/en、synonyms[]
  - taxonomy.family/genus/species
  - characteristics.{type,max_height_cm,leaf,flower}
  - environment.{native_range[],habitat,light_preference,humidity,temperature_c{min,max},space}
  - care.{watering,soil,fertilization,propagation[],difficulty}
  - uses[]、toxicity.{pets,humans}
  - questionnaire_tags.{light,space,level}、tags[]（与推荐算法兼容）
  - sources[{title,url,accessed_at}]

## 清洗与标准化
- 命名与字段统一：统一英文蛇形命名（snake_case）；common_names 下含 zh/en；taxonomy 三段；questionnaire_tags 与 tags 对齐。
- 数据准确性：
  - 学名与分类优先以 Kew POWO 与 Wikipedia 交叉验证；同物异名收录于 synonyms。
  - 毒性：宠物优先参考 ASPCA；无定论处使用“caution/请本地核实”。
- 去重与规范：
  - 同名常用名映射至统一学名；tags 仅使用 {low,medium,high,small,large,beginner,intermediate,expert} 集。
  - 数值单位统一：高度 cm；温度 °C。
- 适用性：
  - light_preference 与 questionnaire_tags.light 语义保持一致（室内养护场景）；space 表示典型占地/体量。

## 首版收录（3 条示例）
- Dracaena trifasciata（虎皮兰/虎尾兰）
- Epipremnum aureum（绿萝/黄金葛）
- Ficus lyrata（琴叶榕）

对应文件：/plant_knowledge_database.json

## 使用说明（小程序端/后端）
- 前端/后端可从 plants[].tags 直接作为 utils/recommend.js 的植物标签输入来源；或从 plants[].questionnaire_tags 生成 tags。
- 推荐流程：
  1) 读取问卷答案 answers[{id:'light'|'space'|'level', value: '...'}]
  2) 读取 plants = db 或 JSON 文件中的 entries（仅 onShelf 场景可由业务层决定）
  3) 调用 utils/recommend.recommend(answers, plants, {topN})
- 字段扩展：新增 safety_flags（如 pet_unsafe、child_unsafe、latex_sap_irritant），可选继续扩展 toxicity.detail 或 care.seasonal_notes；不影响现有推荐逻辑。

## 后续计划
- 从 PlantFlowerDatasets 的 jsonl（若提供）或文本解析提取更多物种；
- 增补常见室内植物 50+（如 Monstera deliciosa、Zamioculcas zamiifolia、Spathiphyllum 等）；
- 引入“禁忌标签”（如 pet_unsafe, child_unsafe）用于后续问卷扩展维度。

## 变更记录
- 2025-08-15 扩充 Batch 1（8种）：Aloe vera（芦荟）、Haworthiopsis attenuata（斑马十二卷）、Crassula ovata（玉树）、Monstera deliciosa（龟背竹）、Zamioculcas zamiifolia（雪铁芋）、Chlorophytum comosum（吊兰）、Aspidistra elatior（一叶兰/蜘蛛抱蛋）、Spathiphyllum wallisii（白鹤芋/和平百合）。优先覆盖多肉/观叶/耐阴/开花/净化空气与宠物友好方向；safety_flags、sources 已同步完善。
- 2025-08-15 首次创建 schema 与 3 条示例数据；完成与推荐算法标签对齐；补充来源链接。

