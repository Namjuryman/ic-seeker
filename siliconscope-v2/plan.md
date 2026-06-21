# SiliconScope v2 下一阶段开发计划

## 目标
构建 Institution Compare + Professor/Author Compare + Mentor Compare + Topic Report + Export MVP

## 批次安排

### Batch 1: 基础服务与 Compare Landing Page
- 后端: `institution-compare.service.ts` — 复用 profile.service.ts 的 candidateRowsByInstitution + summarizePaperRows
- 后端: `author-compare.service.ts` — 复用 candidateRowsByAuthor + summarizePaperRows
- 后端: 更新 `api.ts` 添加 `/compare/institutions`, `/compare/authors` 路由
- 前端: 更新 `types.ts` 添加 InstitutionCompareResult, AuthorCompareResult
- 前端: 更新 `api.ts` 添加 compareInstitutions(), compareAuthors()
- 前端: `ComparePage.tsx` — Compare Landing Page（入口卡片）
- 前端: `InstitutionComparePage.tsx` — 机构对比
- 前端: `AuthorComparePage.tsx` — 作者论文画像对比
- 更新 `App.tsx` 添加 `/compare`, `/compare/institutions`, `/compare/authors` 路由和导航

### Batch 2: Mentor Compare
- 后端: `mentor-compare.service.ts` — 基于 review.service.ts，后端执行阈值裁剪
- 后端: 更新 `api.ts` 添加 `/compare/mentors` 路由
- 前端: 更新 `types.ts` 添加 MentorCompareResult
- 前端: 更新 `api.ts` 添加 compareMentors()
- 前端: `MentorComparePage.tsx` — 导师体验对比，按阈值显示不同内容
- 更新 App.tsx 添加 `/compare/mentors` 路由

### Batch 3: Topic Report MVP
- 后端: `topic-report.service.ts` — 复用 topic.service.ts + search.service.ts
- 后端: 更新 `api.ts` 添加 `/reports/topics/:field` 路由
- 前端: 更新 `types.ts` 添加 TopicReport
- 前端: 更新 `api.ts` 添加 topicReport()
- 前端: `TopicReportPage.tsx` — 方向报告页面
- 前端: 在 TopicsPage 和 LearningPath 添加入口
- 更新 App.tsx 添加 `/reports/topics/:field` 路由

### Batch 4: Export MVP + 整合
- 前端: `utils/exporters.ts` — Markdown / CSV / JSON / BibTeX 导出工具
- 前端: 在 Compare pages 和 TopicReportPage 添加导出按钮
- 前端: 在 TopicReportPage 添加 Add to Reading Queue / Save to Watchlist
- 前后端: Build 和验证

## 总原则
- 不破坏现有功能
- 所有比较只做 decision support，不做排名
- 所有数字都显示 caveat
- 不暴露导师身份信息
- 后端执行 mentor review 阈值保护
- 不导出 copyrighted PDFs
