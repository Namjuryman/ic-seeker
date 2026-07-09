# SiliconScope v2 数据抓取与补全操作手册（GPT Pro 执行版）

Date: 2026-07-08
Owner handoff: 本手册面向执行代理（GPT Pro）。它自包含——不依赖任何对话上下文即可执行。
目标读者需具备运行 PowerShell / Node 命令、读写 SQLite、调用 HTTP API 的能力。

---

## 0. 一句话目标

让本地论文库 `ic_database/ic_papers.sqlite` 的**每个「会议/期刊 × 年份」都完整**（不漏真论文），
并保证已有行的**机构 / 摘要 / 引用 / 标题**尽量补全、无前言垃圾、FTS 搜索索引同步。

当前状态（截至 2026-07-08，已完成一轮富化+清理+ISSCC2024 补全）：
- 论文总数约 **36,861**，覆盖 16 个 venue、2016–2026。
- affiliations 空 3.3%、abstract 空 1.9%、authors 空 0.4%。
- 已知仍不完整：**除 ISSCC 2024 外，绝大多数 venue-year 尚未做目录级补全**（这是本手册的主任务）。

---

## 1. 环境与前置（务必先做）

- 工作目录（所有 `npm run` 都在此执行）：
  `E:\美好暑假\siliconscope-v2\backend`
- 运行时：Node ≥ 22（仓库要求），包管理 npm workspaces。
- 数据库文件：`E:\美好暑假\siliconscope-v2\ic_database\ic_papers.sqlite`（真实约 110MB，不是 LFS 指针）。
- `.env`（在 `backend/`）需有 `CROSSREF_MAILTO=<你的邮箱>`；OpenAlex/Crossref 用它进 polite pool（更稳更快）。可选 `OPENALEX_API_KEY` / `SEMANTIC_SCHOLAR_API_KEY` / `IEEE_API_KEY` 提速，但**均非必需**。
- 独立读库做诊断时，用 better-sqlite3 只读连接（backend 目录下已装依赖）：
  ```js
  import Database from "better-sqlite3";
  const db = new Database("E:/美好暑假/siliconscope-v2/ic_database/ic_papers.sqlite", { readonly: true });
  ```
  临时脚本放在 `backend/` 目录内运行（ESM 才能解析到 `node_modules`），跑完删除。

---

## 2. 关键铁律（踩过的坑，违反必翻车）—— 先读这一节

1. **OpenAlex 只能用 Node `fetch`（undici），不能用 PowerShell 的 `Invoke-RestMethod`。**
   后者对 `api.openalex.org` 会**静默返回空**（`meta.count:0`），会让你误判"被封"。
   验证 OpenAlex 用 `curl.exe` 或 Node 脚本。Crossref/DBLP 两种方式都行。

2. **`papers_fts`（FTS5 全文索引）没有触发器**，靠 `rowid = papers.id` 手动维护。
   任何改动 `title/authors/abstract/venue/domain/doi` 的写操作，必须对该行执行
   `DELETE FROM papers_fts WHERE rowid=? ; INSERT INTO papers_fts(...) VALUES(...)`。
   仓库现有脚本都已正确处理；你若自己写 SQL 改这些列，必须同步 FTS，否则搜索与主表脱节。

3. **会议 ≠ 期刊，权威源不同：**
   - **会议**（ISSCC/VLSI/CICC/DAC/ICCAD/DATE/IEDM/ASSCC/ESSCIRC）→ **DBLP 目录**权威。
     OpenAlex 对会议的 per-year source 只建到约 2022，按年枚举近年会议会返回 0，**不可用**。
   - **期刊**（JSSC/TCAS-I/TCAS-II/TCAD/TVLSI）→ **OpenAlex 按 ISSN/source + 年**枚举可靠；
     Crossref 按 ISSN + 年亦可。（期刊在 OpenAlex 能按年枚举，会议不能。）

4. **IEEE 内容的摘要**：Crossref 基本不存 IEEE 摘要；很多 IEEE 会议 DOI 在 Crossref 直接 404；
   Semantic Scholar 有元数据但无摘要。**免费源里只有 OpenAlex（经 Node）能给 IC 摘要。**

5. **DOI 归一化**：比对/去重前统一规整——去 `https://doi.org/` 前缀、去 `doi:`、转小写、trim。
   （仓库 `paper-import/classify.ts` 的 `normalizeDoi()` 就是标准实现，直接复用。）

6. **DBLP 分页**：`stream:conf/<key>:<year>` 查询单页上限 `h=100`，用 `f=` 偏移翻页；
   `result.hits["@total"]` 是真实总数。DBLP 偶发 HTTP 500，需重试。

7. **写操作先备份**（见 §7）。所有插入行带 `collection_method='backfill:dblp+openalex'`，便于回滚。

---

## 3. 数据模型速览（`papers` 表关键列）

| 列 | 含义 | 补全/写入要点 |
|----|------|--------------|
| `title` | 标题 | ACM(DAC/ICCAD) 部分被截断成缩写，全名在 Crossref `subtitle` |
| `authors` | `"A; B; C"` 分号连接 | |
| `affiliations` | `"机构1; 机构2"` | OpenAlex `authorships[].institutions[].display_name` |
| `abstract` | 摘要 | OpenAlex 的 `abstract_inverted_index` 需反演还原（见现有脚本 `invertAbstract`）|
| `year` `venue` | 年份、规范 venue 标签 | venue 用库内规范值（见 §8 对照表），不要写全称 |
| `venue_rank` | S+/S/A 等 | 用 `classify.ts` 的 `inferVenueRank(venue)` |
| `domain` `domain_hits` | 领域分类 | 用 `classify.ts` 的 `inferDomain({title,abstract,venue,...})` |
| `quality_score` | 排序分 | 用 `classify.ts` 的 `qualityScore(rank, year, citation)` |
| `doi` | 唯一键（归一化后） | 主去重键，库内 DOI 全唯一 |
| `citation_count` | 引用 | OpenAlex `cited_by_count` |
| `semantic_text` | FTS 扩展文本 | 用 `classify.ts` 的 `semanticText([title,abstract,domain,venue])` |
| `collection_method` | 来源标记 | 补全写 `backfill:dblp+openalex` |

可复用的纯函数都在 `backend/src/scripts/paper-import/classify.ts`：
`normalizeDoi / inferVenueRank / inferDomain / qualityScore / semanticText`。

---

## 4. 现成脚本（已就绪，直接用）

在 `backend/` 下运行：

| 命令 | 作用 | 常用参数 |
|------|------|---------|
| `npm run backfill:venue` | 按 venue+year 用权威目录补缺失论文（当前：会议=DBLP） | `--venue=ISSCC --year=2024`、`--years=2016-2026`、`--apply`（默认干跑） |
| `npm run enrich:openalex` | 按 DOI 批量回填机构/摘要/作者/引用、修标题、重建 FTS | `--dry-run`、`--limit=N`、`--refresh-citations`、`--overwrite`、`--batch=50`、`--sleep=150` |
| `npm run clean:frontmatter` | 删前言/刊头等非论文行，级联清理关联表 | 默认干跑，`--apply` 才删，`--limit=N` |
| `npm run snapshots:refresh` | 重算画像/排行榜/导师/地图快照（数据大改后必跑） | 无 |
| `npm run search:smoke` | 搜索性能冒烟（改数据后跑，防慢） | `--threshold-ms=300` |

脚本源码位置：`backend/src/scripts/{backfill-venue,enrich-openalex,clean-frontmatter}.ts`。

---

## 5. 标准作业流程（SOP）

> 建议一次处理一个 venue（16 个 venue 逐个过），每个 venue 跑 2016–当前年。先干跑出缺口，再 `--apply`。

### 步骤 0：备份
```powershell
# 在 backend/ 下，用 better-sqlite3 在线备份（正确处理 WAL）
node -e "const D=require('better-sqlite3');const s=new D('E:/美好暑假/siliconscope-v2/ic_database/ic_papers.sqlite',{readonly:true});const t=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);s.backup('E:/美好暑假/siliconscope-v2/backups/ic_papers_'+t+'.sqlite').then(()=>{s.close();console.log('backup ok');});"
```

### 步骤 1：缺口审计（全会议干跑，产出"每个 venue-year 缺多少"）
对每个会议 venue 跑干跑（不加 `--apply`），把每年 `missing DOIs=` 记成一张表：
```powershell
foreach ($v in "ISSCC","VLSI Symposium","CICC","DAC","ICCAD","DATE","IEDM","ASSCC","ESSCIRC") {
  npm run backfill:venue -- --venue="$v" --years=2016-2026 2>$null | Select-String "backfill\] $v|missing DOIs"
}
```
> 期刊（JSSC/TCAS-I/TCAS-II/TCAD/TVLSI）此步会提示"no DBLP mapping"——它们走 §6 的期刊分支，需先实现。

### 步骤 2：补全会议缺口
先看审计表确认要补的 venue-year 合理（数量不异常），再逐个 `--apply`：
```powershell
npm run backfill:venue -- --venue=ISSCC --years=2016-2026 --apply
# 依次对其余会议 venue 执行
```
backfill 内部已：DBLP 定目录 → OpenAlex 批量取全元数据 → 正确 venue/rank/domain/quality + 建 FTS。

### 步骤 3：期刊补全（需先做 §6 的扩展）
实现期刊分支后：
```powershell
npm run backfill:venue -- --venue=JSSC --years=2016-2026 --apply
# TCAS-I / TCAS-II / TCAD / TVLSI 同理
```

### 步骤 4：富化（补全刚插入行 & 历史遗漏字段）
```powershell
npm run enrich:openalex            # 命中率约 99.9%，约 12 分钟/2 万行
```

### 步骤 5：清垃圾（富化后再清，让富化先"抢救"真论文）
```powershell
npm run clean:frontmatter          # 先干跑看要删什么
npm run clean:frontmatter -- --apply
```

### 步骤 6：刷新快照 + 搜索冒烟
```powershell
npm run snapshots:refresh
npm run search:smoke -- --threshold-ms=300
```

### 步骤 7：验收（见 §9）

---

## 6. 期刊分支实现规格（给 GPT Pro 的编码任务）

`backfill-venue.ts` 目前只做会议（DBLP）。需为期刊增加 **OpenAlex 按 ISSN 枚举**分支。

**方法**：用 ISSN 查 OpenAlex source id，再按 `source.id + publication_year` 游标翻页拉全量 DOI。
```
GET https://api.openalex.org/sources/issn:0018-9200          → 得到 source.id (Sxxxx)
GET https://api.openalex.org/works?filter=primary_location.source.id:Sxxxx,publication_year:2024
    &per-page=200&cursor=*    → 循环用 meta.next_cursor 翻页，直到无结果
```
拿到该期刊该年的全部 DOI 后，与库内 `venue=? AND year=?` 的 DOI diff，缺失者复用现有
`openAlexByDois()` 取元数据并 `INSERT`（与会议分支同一套入库+FTS 逻辑）。

**期刊 ISSN 对照**（IEEE，print ISSN；执行前用 `sources/issn:` 校验一次）：
| venue 标签 | 期刊 | ISSN(print) |
|-----------|------|-------------|
| `JSSC` | IEEE J. Solid-State Circuits | 0018-9200 |
| `TCAS-I` | IEEE TCAS-I: Regular Papers | 1549-8328 |
| `TCAS-II` | IEEE TCAS-II: Express Briefs | 1549-7747 |
| `TCAD` | IEEE Trans. CAD of ICs and Systems | 0278-0070 |
| `TVLSI` | IEEE Trans. VLSI Systems | 1063-8210 |

**代码落点**：在 `backfill-venue.ts` 增加 `const JOURNAL_ISSN: Record<string,string>` 映射与
`async function openAlexJournalToc(issn, year): Promise<TocEntry[]>`，在 `main()` 里当 venue 命中
`JOURNAL_ISSN` 时改走该分支（其余入库逻辑复用）。paratext 过滤对期刊同样适用（刊头/Information for Authors）。

**注意**：OpenAlex 对期刊可能把「勘误 Corrections / Comments」也算进去；入库后交给 §5 步骤5 的
`clean:frontmatter` 兜底清理即可。

---

## 7. 安全与回滚

- **回滚整个 backfill 批次**（删除本次补入的所有行 + FTS + 关联）：
  ```sql
  -- 先取 id 列表，再级联删（参照 clean-frontmatter.ts 的级联表清单）
  SELECT id FROM papers WHERE collection_method='backfill:dblp+openalex';
  ```
  或直接从 §0 步骤0 的备份文件恢复（覆盖 `ic_papers.sqlite`，删除同名 `-wal`/`-shm`）。
- **不要**在 backend dev server 运行时做大批量写入（WAL 写冲突）。先确认 8751 端口无监听。
- 所有删除脚本默认干跑，务必先看清单再 `--apply`。

---

## 8. 附录：venue 规范标签 → DBLP 会议键

| venue 标签（库内值） | 类型 | DBLP key |
|--------------------|------|----------|
| `ISSCC` | conf | `conf/isscc` |
| `VLSI Symposium` | conf | `conf/vlsic` |
| `CICC` | conf | `conf/cicc` |
| `DAC` | conf | `conf/dac` |
| `ICCAD` | conf | `conf/iccad` |
| `DATE` | conf | `conf/date` |
| `IEDM` | conf | `conf/iedm` |
| `ASSCC` | conf | `conf/asscc` |
| `ESSCIRC` / `ESSERC` | conf | `conf/esscirc` |
| `JSSC` `TCAS-I` `TCAS-II` `TCAD` `TVLSI` | journal | 见 §6 ISSN |

> DBLP key 若某会议查不到结果，去 `https://dblp.org/db/conf/<key>/` 核对该会议缩写与年份卷是否存在。

---

## 9. 验收查询（改数据后逐条核对）

```sql
-- 总数与字段完整度
SELECT COUNT(*) FROM papers;
SELECT
  ROUND(100.0*SUM(affiliations='')/COUNT(*),1) aff_empty_pct,
  ROUND(100.0*SUM(abstract='')/COUNT(*),1)     abs_empty_pct,
  ROUND(100.0*SUM(authors='')/COUNT(*),1)      auth_empty_pct
FROM papers;

-- FTS 必须与主表行数一致
SELECT (SELECT COUNT(*) FROM papers) AS papers,
       (SELECT COUNT(*) FROM papers_fts) AS fts;   -- 两值必须相等

-- DOI 无重复（应为 0 组）
SELECT COUNT(*) FROM (SELECT lower(doi) d FROM papers WHERE doi<>'' GROUP BY d HAVING COUNT(*)>1);

-- 某 venue-year 篇数（与 DBLP total 对比）
SELECT year, COUNT(*) FROM papers WHERE venue='ISSCC' GROUP BY year ORDER BY year;

-- 无信号残留（应为 0）：无作者+无摘要+零引用
SELECT COUNT(*) FROM papers WHERE authors='' AND abstract='' AND citation_count=0;
```

**验收基准**（单个 venue-year 补全后）：库内篇数应 ≈ DBLP `@total`（会议）或 OpenAlex `meta.count`（期刊），
差值主要来自 paratext（panel/plenary/forum），可由 `clean:frontmatter` 收敛。

---

## 10. 已知边界 / 待办

- ACM（DAC/ICCAD/DATE）少量缩写标题（如 `AOS`/`nZDC`）全名在 Crossref `subtitle`，OpenAlex 未收；
  如需修全名，加一个 Crossref `title+subtitle` 拼接的小补丁。
- 会议 paratext（panel/plenary/forum）目前部分保留；如需"只留技术论文"，扩展 `clean-frontmatter.ts`
  的 `ADMIN_PHRASES`/`STRICT_ADMIN` 覆盖这些会议条目。
- 引用数会随时间增长；周期性 `enrich:openalex --refresh-citations` 可刷新。

---

## 11. 交付给 GPT Pro 的最小指令模板

> 复制以下给 GPT Pro 作为任务起点：

「按 `docs/DATA_COVERAGE_PLAYBOOK.md` 执行：
(1) 读 §2 铁律；(2) 先做 §5 步骤0 备份；(3) 执行 §5 步骤1 缺口审计并把结果整理成表给我确认；
(4) 我确认后按 §5 步骤2 逐会议 `--apply`；(5) 按 §6 规格实现期刊 ISSN 分支并补全期刊；
(6) 依次跑 enrich→clean→snapshots→search:smoke；(7) 用 §9 验收查询逐条核对并汇报。
全程只用免费源，OpenAlex 一律走 Node（不要用 PowerShell Invoke-RestMethod 测）。」
