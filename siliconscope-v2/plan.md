# SiliconScope v2 — Learning Drill-down & Governance 收口计划

## 目标
把已做出的功能收口，形成数据一致、能跳转、能治理、能长期维护的 IC research intelligence workspace。

## 总体原则
- 不大规模重构，不回归旧版单体结构。
- 每次修改后 `backend` 和 `frontend` 必须 `npm run build` 通过。
- Journal Ingestion 继续禁用；Data Quality 继续手动 Run。
- metadata score / rank / quality 只能解释为 metadata-based indicator。
- 所有大列表限制渲染、分页或 show more。
- 用户数据按 `user_id` 隔离。
- Paper Discussion ≠ Mentor Review，治理逻辑不混用。

## 阶段分解

### Stage 1 — Backend Learning Catalog + API 收口
**文件：**
- `backend/src/data/learning-catalog.ts`
- `backend/src/services/learning.service.ts`
- `backend/src/routes/api.ts`

**任务：**
1. 完善 `validateLearningCatalog()`（当前已有基础实现，需扩展）：
   - routeFamilies 引用的 roadmap slug 是否存在
   - commonFoundations 引用的基础路线/模块是否存在（如果可以校验）
   - dailyLessons 的 roadmapSlug 是否存在
   - roadmap slug 是否重复
   - stage id 是否重复
   - module id 是否重复
   - 每条 roadmap 是否有 title / slug / stages
   - 每条 roadmap 是否有 paperQuery；如果没有，能 fallback 到 relatedSearchQueries[0] 或 title
   - relatedVenues / relatedTopics 为空时给 warning，不要直接崩
   - lessonPlaceholders 为空时给 warning
   - dev 模式 console.warn，非致命 warning 不导致服务启动失败，严重错误（如 slug 重复）可以 throw
2. 确认 slug alias 映射已正确：
   - `analog-foundations` → `analog-mixed-signal`
   - `data-converters` → `analog-mixed-signal` 等（当前已有，需确认映射与真实 slug 一致）
   - `getRoadmap()` 先查原 slug，再查 alias，返回 canonicalSlug
3. `relatedPapersForRoadmap` / `relatedPapersForLesson` 使用 paperQuery 优先，再 fallback 到 relatedSearchQueries[0] 或 title（当前已有，需确认）。
4. Moderation API 增强：支持按 status 筛选 paper comments（reported, pending, visible, hidden, removed）。
5. 确认 identity alias upsert/delete 后 snapshot invalidation 已调用（当前已有 `invalidateAllSnapshots()`）。

### Stage 2 — Frontend Learning 页面收口
**文件：**
- `frontend/src/pages/RoadmapDetailPage.tsx`
- `frontend/src/pages/LearningDashboardPage.tsx`
- `frontend/src/pages/LearningPathPage.tsx`
- `frontend/src/pages/DailyLessonPage.tsx`
- `frontend/src/types.ts`
- `frontend/src/api.ts`
- `frontend/src/utils/routes.ts`
- `frontend/src/index.css`
- `frontend/src/data/learningRoadmaps.ts`

**任务：**
1. `RoadmapDetailPage` 展示新增字段：
   - Hero: title, subtitle, family, level/domain, accent
   - Prerequisites: prerequisitesGroups
   - Stage timeline: stage title, goal, modules, checkpoints, resources
   - Outcomes: 用户学完能做什么
   - Project Ideas: 后续小项目方向
   - Research Links: paperQuery, venues, relatedSearchQueries
   - 所有可点击项跳转到 SiliconScope 搜索 / topic / venue / author / institution
2. `LearningDashboardPage` 展示 routeFamilies / commonFoundations / 16 条路线 / today lesson / full route library link。
   - /learning 和 /learning-path 互相跳转
3. `LearningPathPage` 降级容错：roadmaps 失败时不白屏，routeFamilies 失败时降级为 ungrouped list，foundations 失败时隐藏区块。
4. `DailyLessonPage` 增加相关搜索链接。
5. 清理 `frontend/src/data/learningRoadmaps.ts`：保留 `learningSource` 和 `commonFoundations` / `routeFamilies` 的 type 定义但标记 deprecated，README 写明 canonical source。
6. `types.ts` 补充 Learning 相关类型（如有缺失）。
7. `routes.ts` 补充需要的路由 helper。

### Stage 3 — Drill-down 页面收口
**文件：**
- `frontend/src/pages/TopicsPage.tsx`
- `frontend/src/pages/GeoPage.tsx`
- `frontend/src/pages/AuthorsPage.tsx`
- `frontend/src/pages/InstitutionsPage.tsx`
- `frontend/src/components/EntityLink.tsx`
- `frontend/src/components/PaperLink.tsx`

**任务：**
1. `TopicsPage`：所有关键实体和数字可点击 → topic total count, representative paper, venue count, year count, active author, active institution。
   - 使用 `PaperLink` / `EntityLink` / `searchPath()`
   - 添加 caveat 提示
2. `GeoPage`：representative paper → `/papers/:id`, top institution → `/institutions/:name`, field/domain bar → `/?field=FIELD&country=COUNTRY`, country paper count → `/?country=COUNTRY`。
   - 添加 country filtering caveat
   - 添加 Geo analysis caveat
3. `AuthorsPage` profile：venue → `/?venue=VENUE`, year → `/?yearFrom=YYYY&yearTo=YYYY`, rank → `/?rank=RANK`, field → `/?field=FIELD`, coauthors → `/authors/:name`, institutions → `/institutions/:name`。
   - 添加 Author profile caveat
4. `InstitutionsPage` profile：top authors → `/authors/:name`, venues → `/?institution=INST&venue=VENUE`, fields → `/?institution=INST&field=FIELD`, country/city → `/geo` 或 `/?country=COUNTRY`。
   - 添加 Institution profile caveat
5. `EntityLink` 和 `PaperLink` 确保支持所有需要的跳转。

### Stage 4 — Mentor Review + Paper Discussion + Moderation 治理收口
**文件：**
- `frontend/src/pages/MentorsPage.tsx`
- `frontend/src/pages/PaperDetailPage.tsx`
- `frontend/src/pages/ModerationPage.tsx`
- `backend/src/services/review.service.ts`
- `backend/src/services/moderation.service.ts`
- `backend/src/routes/api.ts`
- `frontend/src/types.ts`
- `frontend/src/api.ts`

**任务：**
1. `MentorsPage` ReviewSection 修正阈值：
   - approvedCount < 3：不显示评分细节，不显示自由文本，只显示“样本不足，暂不公开统计”
   - approvedCount >= 3 && < 5：只显示 aggregate
   - approvedCount >= 5 && < 10：显示 aggregate + threshold-safe summary
   - approvedCount >= 10：显示 aggregate + summary + curated anonymous comments
   - 保持 public alias 永远 Anonymous Verified Reviewer
   - 页面文案：Reviews are verified anonymous and moderated...
2. `PaperDetailPage` 增加 Report 按钮：
   - 每条 comment 加 Report，reason 可选 off-topic, personal attack, spam, misleading, copyright concern, other
   - 调用 `api.reportContent("paper_comment", comment.id, reason)`
   - report 后反馈，不要刷新整页，已 report 避免重复点击
   - 评论区提示：Discuss the paper, methods, circuits, experiments, and reproducibility. Do not attack authors personally.
3. `ModerationPage` 增强：
   - 支持筛选 reported / pending / visible / hidden / removed
   - 管理员操作：hide, remove, restore, keep pending, add reason
   - UI 使用 paper discussion 语义：Visible, Hidden, Removed, Needs review, Reported
   - 普通评论默认公开；pending/risky 不出现在公开 PaperDetail；Report 后 moderation 能看到；Hide 后普通用户不可见；Restore 后重新可见
4. `moderation.service.ts` / `api.ts` 支持按状态筛选和新的 moderation 语义。

### Stage 5 — Snapshot Admin + Env Docs + Error Handling
**文件：**
- `frontend/src/pages/SnapshotAdminPage.tsx`
- `backend/src/services/snapshot.service.ts`
- `siliconscope-v2/.env.example`
- `siliconscope-v2/README.md`
- 所有需要空状态/错误处理检查的页面

**任务：**
1. `SnapshotAdminPage`：
   - 确认 list, refresh, clear 可用
   - 显示 key, updatedAt, bytes, stale/fresh
   - 操作 loading 明确，防止重复点击
   - 页面提示：Snapshots are precomputed intelligence caches...
2. `snapshot.service.ts`：
   - 确认 alias upsert/delete 后确实删除 `computed_snapshots` 表数据
3. `.env.example`：
   - 更新为实际代码一致的变量名：PORT=8751, DATABASE_URL=ic_database/ic_papers.sqlite, JWT_SECRET=..., FRONTEND_ORIGINS=..., APP_NAME=SiliconScope
   - 移除旧版变量：IC_SEEKER_DB, COOKIE_SECRET, PORT=8750
4. `README.md`：
   - 补 Git LFS 数据库说明
   - 写清楚 Learning catalog canonical source
   - 写清楚 Journal Ingestion disabled, Data Quality manual-run only
5. 错误处理和空状态检查：
   - LearningDashboardPage, LearningPathPage, RoadmapDetailPage, DailyLessonPage, HomePage, PaperDetailPage, TopicsPage, GeoPage, AuthorsPage, InstitutionsPage, MentorsPage, VenueMatrixPage, ModerationPage, SnapshotAdminPage, DataQualityPage, IdentityPage
   - loading 明确，error 明确，empty state 友好，不显示 undefined/null，404 友好提示，API 部分失败时 partial render 不要白屏

### Stage 6 — Build 验证 + 交付
**任务：**
1. `cd backend && npm run build`
2. `cd frontend && npm run build`
3. 生成修改摘要、文件列表、测试结果、已知限制、交付包

## 依赖关系
- Stage 1 和 Stage 3 可以并行（backend 和 frontend drill-down 无强依赖）
- Stage 2 依赖 Stage 1 的 API 确认（但当前 API 已基本完成，可并行）
- Stage 4 涉及 backend 和 frontend，需与 Stage 1 的 moderation API 增强协调
- Stage 5 可以与其他阶段大部分并行，但需等前面阶段的文件修改完成
- Stage 6 依赖所有前面阶段

## 执行顺序
建议：Stage 1 → (Stage 2 + Stage 3 + Stage 4) 并行 → Stage 5 → Stage 6
由于 Stage 4 的 moderation API 增强与 Stage 1 有重叠，把 moderation API 放在 Stage 1 一起做。
