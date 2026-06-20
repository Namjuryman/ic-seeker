# SiliconScope v2 Worklog

## 2025-06-19 第三轮融合：身份消歧 + 地理地图增强

### 后端改动

| 文件 | 说明 |
|------|------|
| `backend/src/db/schema.ts` | 新增 `authorAliases`、`institutionAliases` 表 |
| `backend/src/services/author-identity.service.ts` | **新增** 作者姓名标准化与消歧服务（NFKD 归一化、逗号格式解析、别名变体匹配） |
| `backend/src/services/institution-identity.service.ts` | **新增** 机构身份归一化服务（内置 25+ 知名机构别名映射，支持 QS 排名关联） |
| `backend/src/services/geo.service.ts` | 大幅扩展：新增基于地理坐标的论文分布热力图、国家/城市级聚合、多边形地理查询 |
| `backend/src/services/mentor.service.ts` | 扩展：导师评分结构化、评论 moderation 状态 |
| `backend/src/services/profile.service.ts` | 扩展：学者画像集成身份消歧、论文归属准确率提升 |
| `backend/src/services/paper.service.ts` | 扩展：论文收藏/阅读状态/笔记/标签 状态管理 |
| `backend/src/services/search.service.ts` | 优化：搜索性能调优 |
| `backend/src/services/stats.service.ts` | 扩展：统计数据增强 |
| `backend/src/services/venue-matrix.service.ts` | 扩展：会议矩阵增强 |
| `backend/src/services/discussion.service.ts` | 扩展：讨论服务 |
| `backend/src/routes/api.ts` | 更新：新增身份服务路由、论文状态管理接口 |

### 前端改动

| 文件 | 说明 |
|------|------|
| `frontend/src/pages/GeoPage.tsx` | **大幅重构** 新增世界地图可视化（D3 + TopoJSON），支持国家/城市级论文分布、热力图、缩放交互 |
| `frontend/src/pages/MentorsPage.tsx` | 扩展：导师评价结构化展示、评分雷达图 |
| `frontend/src/pages/AuthorsPage.tsx` | 扩展：集成作者身份消歧，同名作者合并展示 |
| `frontend/src/pages/InstitutionsPage.tsx` | 扩展：机构身份归一化，别名映射展示 |
| `frontend/src/pages/HomePage.tsx` | 优化：搜索交互增强 |
| `frontend/src/pages/TopicsPage.tsx` | 优化：主题洞察增强 |
| `frontend/src/pages/VenueMatrixPage.tsx` | 优化：会议矩阵增强 |
| `frontend/src/pages/ModerationPage.tsx` | 优化：审核面板增强 |
| `frontend/src/pages/DataQualityPage.tsx` | 优化：数据质量监控增强 |
| `frontend/src/utils/geoUtils.ts` | **新增** 地理数据处理工具（坐标投影、国家代码映射、热力图数据聚合） |
| `frontend/src/api.ts` | 更新：新增身份服务 API、论文状态管理接口 |
| `frontend/src/App.tsx` | 更新：路由配置 |
| `frontend/src/types.ts` | 更新：新增地理/身份相关类型 |
| `frontend/src/index.css` | 更新：地图样式、新组件样式 |
| `frontend/public/styles.css` | 更新：全局样式 |
| `frontend/public/data/world-countries-110m.geojson` | **新增** 世界地图 TopoJSON 数据（用于 GeoPage 可视化） |

### 数据库变更

- 新增表 `author_aliases`：作者别名映射（alias → canonical_name，支持 institution_hint）
- 新增表 `institution_aliases`：机构别名映射（alias → canonical_name，支持 country_code/city/QS 排名关联）
- 两个表均已存在于数据库中并建立索引

### 验证状态

- **Backend**: `http://localhost:8751` ✅ (health check ok, 38950 papers)
- **Frontend**: `http://localhost:5173` ✅ (200 ok)

---

## 2025-06-19 第二轮融合：缓存 + 性能 + 审核 + 数据质量

### 后端改动

| 文件 | 说明 |
|------|------|
| `backend/src/db/performance.ts` | **新增** SQLite 性能优化设置（WAL 模式、cache_size、temp_store、mmap_size 等） |
| `backend/src/services/cache.service.ts` | **新增** 内存缓存服务（TTL 缓存、搜索/API 响应缓存） |
| `backend/src/services/data-quality.service.ts` | **新增** 数据质量监控服务（论文完整性评分、字段缺失率统计） |
| `backend/src/services/journal-filter.service.ts` | **新增** 期刊过滤服务（黑名单/白名单管理） |
| `backend/src/services/moderation.service.ts` | **新增** 内容审核服务（评论/评价举报、审核日志） |
| `backend/src/services/search.service.ts` | 优化：搜索性能调优（基于缓存服务） |
| `backend/src/services/stats.service.ts` | 扩展：统计数据增强（集成缓存） |

### 前端改动

| 文件 | 说明 |
|------|------|
| `frontend/src/pages/PaperDetailPage.tsx` | **新增** 论文详情页（收藏、阅读状态、笔记、标签、PDF 查看） |
| `frontend/src/pages/HomePage.tsx` | 大幅扩展：搜索结果筛选、详情侧边栏、论文卡片交互 |
| `frontend/src/pages/DataQualityPage.tsx` | **新增** 数据质量监控面板 |
| `frontend/src/pages/ModerationPage.tsx` | **新增** 内容审核管理面板 |
| `frontend/src/pages/JournalIngestionPage.tsx` | **新增** 期刊导入页面（骨架） |
| `frontend/src/api.ts` | 更新：新增论文状态管理、标签、审核等 API |
| `frontend/src/types.ts` | 更新：新增论文详情、审核、数据质量类型 |
| `frontend/src/App.tsx` | 更新：新增页面路由 |
| `frontend/src/index.css` | 更新：样式扩展 |

---

## 2025-06-19 第一轮融合：基础架构 + 核心页面

### 项目创建

- 创建 `siliconscope-v2/` 目录
- 后端：Express 4 + Drizzle ORM + better-sqlite3 + TypeScript
- 前端：React 19 + Vite + TypeScript + Tailwind CSS
- 复制原项目 `ic_database/ic_papers.sqlite` 和 `public/assets/` 资产

### 后端服务迁移

| 服务 | 说明 |
|------|------|
| `stats.service.ts` | 统计服务（论文总数、年份分布、 venues 分布） |
| `search.service.ts` | 搜索服务（FTS5 全文搜索、分页、多条件筛选） |
| `paper.service.ts` | 论文服务（获取单篇论文、收藏、阅读状态） |
| `profile.service.ts` | 学者画像服务（作者统计、论文列表、H-index） |
| `topic.service.ts` | 主题分析服务（关键词聚类、热门主题） |
| `geo.service.ts` | 地理分布服务（国家/城市级论文分布） |
| `venue-matrix.service.ts` | 会议矩阵服务（venue 交叉统计） |
| `mentor.service.ts` | 导师评价服务（评分、评论） |
| `discussion.service.ts` | 讨论服务（论文评论） |
| `review.service.ts` | 评价服务（导师评价） |

### 前端页面

| 页面 | 说明 |
|------|------|
| `HomePage.tsx` | 学术搜索主页 |
| `TopicsPage.tsx` | 方向洞察 |
| `GeoPage.tsx` | 区域地图 |
| `AuthorsPage.tsx` | 学者画像 |
| `InstitutionsPage.tsx` | 机构实力 |
| `MentorsPage.tsx` | 导师评价 |
| `VenueMatrixPage.tsx` | 会议矩阵 |

### 脚本

- `start-dev.bat` / `start-dev.ps1`：启动前后端开发服务器
- `stop-dev.bat` / `stop-dev.ps1`：停止所有开发进程
- 端口：Backend 8751, Frontend 5173

### 文档

- `docs/ROADMAP.md`：优化路线图（12 个方向）
- `README.md`：项目说明
