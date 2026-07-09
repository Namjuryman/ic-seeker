# SiliconScope v2 Worklog

## 2026-07-08 数据修复：OpenAlex 富化 + 前言垃圾清理

### 背景
数据体检发现主表血肉残缺：affiliations 缺 54.7%、abstract 缺 53.9%、citation 缺 22%，
并混入大量会议前言页（Committees / Welcome Message / Information for Authors / 期刊刊头等）
被当成论文。DOI 基本齐全（98.7%），骨架完好，故选择「基于 DOI 回填富化 + 清垃圾」而非重拉。

### 新增脚本
| 脚本 | npm | 说明 |
|------|-----|------|
| `backend/src/scripts/enrich-openalex.ts` | `enrich:openalex` | 按 DOI 批量（50/次）向 OpenAlex 回填 affiliations/abstract/authors/citation，修复截断标题，重建 FTS 行与 quality_score。支持 `--dry-run`/`--limit`/`--overwrite`/`--refresh-citations`，断点续跑，限流。 |
| `backend/src/scripts/clean-frontmatter.ts` | `clean:frontmatter` | 删除非论文的前言/刊头行。三条规则：A=无作者+无摘要+零引用；B=管理类标题且无机构；C=期刊刊头/严格管理短语（无视机构）。默认干跑，`--apply` 才删，级联清理 FTS/provenance/用户数据/topic-edges/AI 标注等所有引用表。 |

### 数据变更（一次性执行）
- 富化 OpenAlex：21,188 候选 → 命中 21,165（99.9%），补机构 18,125、补摘要 18,619、更新引用 8,233、domain 重分类 2,809。
- 清理垃圾：分三轮删除 1,445 + 469 + 226 = 2,140 行前言/刊头。
- 结果：papers 38,950 → 36,810；affiliations 空 54.7%→3.3%，abstract 空 53.9%→1.9%，authors 空 4.9%→0.3%；重复 DOI=0，无信号残余=0，FTS 与主表行数一致。
- 备份：`backups/ic_papers_before_enrich_2026-07-08T10-27-49.sqlite`（富化前全量在线备份）。
- 已 `snapshots:refresh` 重算全部快照（画像/排行榜/导师/地图）。

### 运行环境注意
OpenAlex 在中国网络下经 Node `fetch`（undici）可正常访问；PowerShell 的 `Invoke-RestMethod`
对 OpenAlex 会静默返回空，勿用其测试。富化脚本走 Node，无此问题。

### 后续可选
- ACM（DAC/ICCAD/DATE）少量缩写标题（如 `AOS`/`nZDC`）全名在 Crossref 的 subtitle 字段，
  OpenAlex 未收；如需修全名可加一个 Crossref `title+subtitle` 小补丁。
- 剩余 58 组同标题均为唯一 DOI 的不同论文（非重复记录），无需处理。

## 2026-07-08 覆盖完整性：按目录补全缺失论文

### 背景
按关键词搜索建库不保证某会议某年的完整目录，旗舰论文会漏。抽查 ISSCC 2024：
库里 232 篇，DBLP 权威目录 246 篇真论文，**缺 51 篇**（含 AMD MI300 Chiplet、GDDR7 DRAM、
160GS/s TI-DAC 等顶会论文）。OpenAlex 对近年会议的 per-year source 只建到 2022，按年枚举返回 0，
故会议改用 DBLP 目录为权威基准。

### 新增脚本
| 脚本 | npm | 说明 |
|------|-----|------|
| `backend/src/scripts/backfill-venue.ts` | `backfill:venue` | 按 venue+year 用权威目录补缺失论文。会议走 DBLP `stream:conf/<key>:<year>`（分页），按 DOI 与库 diff，缺失者用 OpenAlex 批量取全元数据后入库（正确 venue/rank/domain/quality_score + FTS 行）。`--venue`/`--year`/`--years=a-b`/`--apply`，默认干跑。DBLP 会议键内置 ISSCC/CICC/DAC/ICCAD/DATE/IEDM/ASSCC/ESSCIRC/VLSI。 |

### 测试结果（ISSCC 2024）
- DBLP 真论文 246，库里 232，缺 51；OpenAlex 51/51 全部取到元数据 → 已入库。
- ISSCC 2024：232 → 282（241 篇带 session 编号的真报告）；无新增重复；FTS 同步（36,810→36,861）。
- 补入行 `collection_method='backfill:dblp+openalex'`，易回滚。

### 方法论要点
- **会议**（ISSCC/VLSI/CICC/DAC/ICCAD/DATE/IEDM/ASSCC/ESSCIRC）→ DBLP 目录权威，`total` 即真实篇数。
- **期刊**（JSSC/TCAS-I/II/TCAD/TVLSI）→ 用 OpenAlex 按 ISSN/source + 年枚举，或 Crossref 按 ISSN+年（期刊在 OpenAlex 可按年枚举，会议不行）。backfill 脚本的期刊分支待接入。
- 超出官方 234/DBLP 246 的部分是原库 ~37 条非论文会议条目（panel/plenary/forum），可选二次微清理。

---

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
