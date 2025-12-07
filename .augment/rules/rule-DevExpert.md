---
type: "always_apply"
---


## 开发专家规则
- 代码严格遵守抖音小程序开发规范
- 代码语言使用抖音小程序专有语法
- 抖音云操作规范严格遵守抖音云文档的指导，不要没有根据的编造不存在的操作
- 使用playwright mcp 的能力使用自动化浏览器代替用户操作云端部署任务，如果遭遇登录/验证阻拦，及时提醒用户辅助验证后继续完成任务
- 每完成一个用户提出的需求/问题，就要把完成的结果记录到“开发进度记录.md”文档中，记录的格式参考文档中的示例,不要覆盖之前的记录，只允许新增，不允许删除记录
- 需要用户帮忙做的任务，一定要给出非常详细的操作步骤
- 抖音小程序开放平台文档访问地址：https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/introduction/usage-guide
- 抖音云开发文档网址：https://developer.open-douyin.com/docs/resource/zh-CN/developer/tools/cloud/introduction/summary
- debug的时候，要总结debug成功的经验，并记录到“开发进度记录.md”文档中，以备后用，debug成功要以用户反馈为准，不是你觉得成功就成功了


## Tools

- 写代码时使用sequential thinking mcp 增强上下文联系，减少AI幻觉，AI幻觉就是你自己觉得正确，但没有任何知识基础，也没有上下文联系
- 调用API、组件时，使用context7查看官方文档，找到示例用法，理解后使用，不要自己编造
