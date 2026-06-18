# SiliconScope Commercial README

**SiliconScope** is an IC research intelligence platform for discovering papers, tracking research topics, profiling professors and institutions, and understanding the global semiconductor research landscape.

It is the commercial evolution of the early `IC Seeker` prototype.

The goal is not to build another generic paper search engine. The goal is to build a vertical intelligence platform for integrated-circuit students, researchers, applicants, labs, and semiconductor teams.

> Discover papers. Track research topics. Profile professors and institutions. Understand the IC research landscape.

---

## 1. Product Positioning

SiliconScope focuses on **IC research intelligence**, not only paper search.

General academic search engines are powerful, but they do not directly answer many practical IC research questions:

- Which professors are active in PMIC, ADC, PLL, RF/mmWave, memory, or EDA?
- Which institutions are strong in a specific IC topic?
- Which papers are representative in a subfield?
- How has a topic changed over the past few years?
- Which professors are still publishing in a specific direction?
- Which research groups may fit a student's goals?
- Which regions are becoming more active in semiconductor research?

SiliconScope aims to connect:

```text
papers
→ topics
→ professors
→ institutions
→ regions
→ research groups
→ application / research decisions
```

The long-term product direction is:

```text
IC Research Intelligence Platform
```

not merely:

```text
paper search website
```

---

## 2. Name and Brand

Recommended product name:

```text
SiliconScope
```

Possible Chinese names:

```text
硅镜
芯镜
硅境
```

Recommended tagline:

```text
Map the world of integrated-circuit research.
```

Alternative tagline:

```text
Research intelligence for the semiconductor era.
```

Chinese positioning:

```text
SiliconScope 是一个面向集成电路领域的科研情报平台，
帮助用户发现论文、追踪方向、分析教授与机构，并理解全球半导体研究格局。
```

---

## 3. Difference from ChipSeeker

SiliconScope should not position itself as a clone of ChipSeeker.

A better distinction is:

```text
ChipSeeker helps users search papers.
SiliconScope helps users understand the IC research landscape.
```

### 3.1 ChipSeeker Strengths

ChipSeeker is strong as a local IC paper search and reading tool. Its likely strengths include:

- semantic paper search
- AI-assisted paper exploration
- personal paper-library workflow
- paper notes and export
- lightweight local research assistant experience

### 3.2 SiliconScope Strengths

SiliconScope should compete on a different axis:

- larger IC metadata database
- professor profiles
- institution profiles
- topic intelligence
- regional intelligence map
- IC venue-aware scoring
- research trend analysis
- application and advisor-selection intelligence
- future verified group-experience layer

SiliconScope should not try to win only by having a better search box.

Its stronger commercial story is:

```text
A vertical intelligence platform for IC research decisions.
```

### 3.3 Strategic Differentiation

| Dimension | ChipSeeker | SiliconScope |
|---|---|---|
| Core identity | IC paper search tool | IC research intelligence platform |
| Main user action | search papers | understand topics, people, institutions, regions |
| Data value | paper retrieval | research landscape mapping |
| Strongest layer | semantic search / personal library | professor, institution, topic, and group intelligence |
| Commercial potential | productivity tool | intelligence platform / SaaS |
| Main risk | limited platform scope | higher data quality and moderation burden |

---

## 4. Core Product Modules

### 4.1 Paper Intelligence

Paper pages should provide:

- title, authors, venue, year, DOI
- topic classification
- venue-aware quality indicators
- related papers
- citation formats
- reading status
- notes and tags
- technical discussion
- possible future private full-text analysis

The platform should avoid redistributing copyrighted PDFs.

### 4.2 Topic Intelligence

Topic pages should answer:

- What are the most active papers in this topic?
- Which professors publish frequently in this topic?
- Which institutions are strong in this topic?
- How has this topic changed over time?
- Which venues are most relevant?
- Which subtopics are emerging?

Example IC topic hierarchy:

```text
Power Management
  ├── LDO
  ├── DC-DC
  ├── buck converter
  ├── boost converter
  ├── switched-capacitor converter
  └── charge pump

Data Converters
  ├── SAR ADC
  ├── pipeline ADC
  ├── sigma-delta ADC
  └── DAC

Clocking
  ├── PLL
  ├── DLL
  ├── CDR
  └── oscillator

RF/mmWave
Memory / Compute-in-Memory
EDA / CAD
Devices / Process / 3D Integration
Biomedical / Sensor IC
Security / Reliability
```

### 4.3 Professor Intelligence

Professor pages should show:

- publication activity
- active topics
- venue distribution
- yearly trend
- collaborators
- institutions
- representative papers
- topic continuity
- possible group-experience summary in the future

Important disclaimer:

```text
Scores and rankings are metadata-based indicators for research discovery.
They are not final judgments of academic quality.
```

### 4.4 Institution Intelligence

Institution pages should show:

- publication activity
- topic strengths
- active professors
- venue distribution
- yearly trend
- representative papers
- regional comparison

Institution intelligence depends heavily on institution normalization.

### 4.5 Regional Intelligence

Regional maps can show estimated research activity by country or region.

Early versions should clearly state that regional mapping is metadata-based and may be affected by:

- raw affiliation noise
- missing affiliations
- institution aliases
- historical affiliation changes
- multi-institution collaborations

A mature version should use:

```text
raw affiliation
→ normalized institution
→ verified country / city
→ regional research map
```

---

## 5. Community and Trust Layer

SiliconScope can become stronger than a pure paper tool by adding a community trust layer.

However, community features must be separated into two identity models:

```text
Paper discussion: public nickname identity
Mentor / group experience: verified anonymous identity
```

This distinction is central to the product.

---

## 6. Paper Discussion Policy

Paper discussion should **not be anonymous** by default.

Reason:

```text
Paper discussion is technical academic discussion.
Public identity encourages responsibility and reduces careless claims.
```

Public display:

```text
nickname + verification badge
```

Examples:

```text
PMIC_Rookie · Verified
AnalogCat · Verified
Chen_ADC · Unverified
```

Paper discussion should focus on:

- technical questions
- method analysis
- formula clarification
- reproduction notes
- related work
- implementation details
- reading summaries
- corrections with evidence

Recommended comment categories:

```text
Question
Technical Note
Reproduction Note
Related Work
Correction
Reading Summary
```

Paper discussion should not allow:

- personal attacks against authors
- unsupported plagiarism/fraud accusations
- insults
- private information
- full-text PDF sharing
- large copyrighted excerpts
- copied figures or tables without permission
- fake reviews
- undisclosed conflicts of interest

Product principle:

```text
Critique the paper, not the person.
```

Chinese version:

```text
评论论文内容，不攻击作者个人。
```

---

## 7. Mentor and Group Experience Policy

Mentor and research-group reviews should be **verified anonymous**.

Reason:

```text
Students will not speak honestly if mentor reviews expose their identity.
```

But pure anonymity is dangerous because it may encourage false or malicious reviews.

Therefore, the model should be:

```text
verified internally
anonymous publicly
```

Public display examples:

```text
Verified Reviewer
Verified Former Group Member
Verified Applicant
Anonymous Verified Review #A128
```

The platform should not publicly display:

- email
- school email domain
- real name
- nickname
- exact enrollment year
- exact program identity
- small-group identifying details
- overly specific research direction if it exposes the reviewer

### 7.1 Group Experience Dimensions

Mentor/group reviews should be structured first, text second.

Suggested dimensions:

```text
Mentorship quality
Research fit
Meeting frequency
Publication support
Tape-out / experiment opportunity
Funding stability
Graduation predictability
Lab culture
Workload intensity
Career support
```

Workload intensity should be descriptive, not moralized.

Example:

```text
1 = relaxed
3 = moderate
5 = very intense
```

not:

```text
1 = good
5 = exploitative
```

### 7.2 Text Prompts

Free text should be guided by neutral prompts:

```text
What did this group do well?
What should future students prepare for?
What type of student may fit this group?
What information do you wish you had known before joining?
```

Avoid prompts like:

```text
Say anything about this professor.
```

### 7.3 Display Thresholds

Because IC research groups are small, anonymous reviews can still become identifiable.

Recommended minimum display rules:

```text
< 3 reviews:
  show "insufficient data"

3–4 reviews:
  show broad distribution only
  no exact average
  no free-text quotes

5+ reviews:
  show aggregate scores and summary

10+ reviews:
  show trends and richer analysis
```

### 7.4 No Blacklist Design

SiliconScope should not build:

```text
worst advisor ranking
avoid-this-professor list
blacklist
gossip wall
```

The better positioning is:

```text
fit matching
group experience intelligence
research environment insight
```

The product should help users understand:

```text
Which type of student may fit this group?
What should applicants prepare for?
What are the strengths and cautions?
```

---

## 8. Commercial Strategy

SiliconScope should not monetize by selling gossip or raw negative reviews.

It should monetize structured intelligence.

### 8.1 Free Tier

Free users may access:

- basic paper search
- basic paper pages
- basic professor profiles
- basic institution profiles
- limited topic pages
- limited saved papers

### 8.2 Student Pro

Target users:

```text
MSc / MPhil / PhD / RA applicants
beginner IC researchers
students choosing topics or advisors
```

Possible features:

- advanced professor profile
- advanced institution comparison
- topic trend dashboard
- application shortlist
- saved searches
- research folders
- weekly topic digest
- group experience summary

Possible early pricing:

```text
USD 5–10 / month
USD 49–99 / year
```

### 8.3 Research Pro

Target users:

```text
research students
young researchers
RAs
early-stage academics
```

Possible features:

- advanced search
- representative paper recommendation
- topic watchlist
- new paper alerts
- BibTeX / Markdown / NotebookLM export
- collaboration network
- advanced trend analysis

Possible pricing:

```text
USD 15–30 / month
USD 149–299 / year
```

### 8.4 Lab / Institution / Enterprise

Target users:

```text
research groups
universities
semiconductor companies
consulting teams
talent teams
```

Possible features:

- global IC research map
- topic intelligence report
- institution comparison
- competitor lab tracking
- talent source analysis
- API / CSV export
- team workspace
- custom reports

Possible pricing:

```text
Lab plan: USD 500–2000 / year
Enterprise: custom pricing
```

---

## 9. Legal and Data-Risk Principles

SiliconScope should be designed as a commercial platform from day one.

Important risk areas:

```text
metadata licensing
publisher abstract reuse
copyrighted PDFs
user-generated content
defamation
fake reviews
personal data
anonymous review re-identification
moderation burden
database provenance
```

### 9.1 Metadata

Prefer open and clearly reusable metadata sources.

For commercial use, be careful with sources that have restrictive API terms.

Each paper record should store source provenance:

```text
source name
source work ID
DOI
URL
collection time
raw metadata snapshot if allowed
```

### 9.2 PDFs and Full Text

The platform should not:

- redistribute publisher PDFs
- bulk-download copyrighted papers
- expose user-uploaded PDFs publicly
- allow PDF sharing in comments

Private user-uploaded PDFs may be supported later for personal reading workflows only.

### 9.3 User Data

The platform should clearly separate:

```text
internal identity
public identity
```

Internal identity may include:

- email
- password hash
- verification status
- subscription status
- moderation history

Public identity depends on context:

```text
paper discussion: nickname + verified badge
mentor review: anonymous verified reviewer
```

### 9.4 Review Governance

The platform should include:

- community guidelines
- terms of service
- privacy policy
- copyright policy
- report mechanism
- appeal mechanism
- moderation logs
- author correction request
- data deletion request
- account deletion request

---

## 10. Suggested Database Design

### 10.1 Users

```sql
users
- id
- email
- password_hash
- nickname
- verification_status
- verification_level
- subscription_plan
- created_at
```

### 10.2 Paper Comments

```sql
paper_comments
- id
- paper_id
- user_id
- comment_type
- body
- moderation_status
- created_at
```

Public display:

```text
nickname + verified badge
```

### 10.3 Mentor Reviews

```sql
mentor_reviews
- id
- professor_id
- user_id
- public_alias
- is_verified_review
- relationship_type
- structured_scores_json
- strengths_text
- cautions_text
- fit_text
- moderation_status
- created_at
```

Public display:

```text
Verified Reviewer
```

### 10.4 Moderation

```sql
content_reports
- id
- target_type
- target_id
- reporter_user_id
- reason
- status
- created_at
```

```sql
moderation_logs
- id
- target_type
- target_id
- moderator_id
- action
- reason
- created_at
```

---

## 11. Architecture Direction

The project should continue moving from a compact MVP toward a maintainable commercial web platform.

Recommended backend structure:

```text
ic_seeker/
  config/
  db/
  lib/
  repositories/
  routes/
  services/
  server.mjs
```

Recommended separation:

```text
routes        HTTP request/response handling
services      business logic and IC-domain intelligence
repositories  SQL and database access
db            schema and migrations
config        environment variables and paths
lib           shared utilities
```

Frontend should also be modularized over time:

```text
public/js/
  api.js
  state.js
  router.js
  i18n.js
  render/
    papers.js
    detail.js
    topics.js
    geo.js
    profiles.js
  utils/
```

A frontend framework is not required immediately. Modular vanilla JavaScript is enough for the next stage.

React / Vue / Next.js becomes more reasonable when the product grows into:

- dashboards
- comparison pages
- PDF reader
- subscription flows
- team workspace
- complex account system

---

## 12. Product Roadmap

### Phase 1 — Data Foundation

- improve paper deduplication
- improve venue normalization
- improve topic taxonomy
- improve institution normalization
- improve author disambiguation
- add data quality reports
- add source provenance

### Phase 2 — Intelligence MVP

- professor intelligence
- institution intelligence
- topic intelligence
- regional intelligence
- representative paper recommendation
- saved searches
- research folders

### Phase 3 — Community Layer

- public paper discussion
- verified user badge
- paper technical notes
- reproduction notes
- report and moderation system

### Phase 4 — Group Experience

- verified anonymous mentor/group reviews
- structured review dimensions
- text moderation
- minimum display thresholds
- group fit summary
- advisor correction request

### Phase 5 — Monetization

- Student Pro
- Research Pro
- lab/institution plans
- topic watchlists
- intelligence reports
- exports
- team workspace

### Phase 6 — Commercial Platform

- stronger account system
- subscription billing
- admin dashboard
- audit logs
- API access
- enterprise reports
- data partnerships

---

## 13. Product Principles

SiliconScope should follow these principles:

```text
1. Build intelligence, not just search.
2. Sell structured insight, not gossip.
3. Critique papers, not people.
4. Protect reviewers when power imbalance exists.
5. Verify users when trust matters.
6. Avoid blacklists and personal attacks.
7. Show uncertainty when data is incomplete.
8. Keep source provenance.
9. Do not redistribute copyrighted PDFs.
10. Make rankings explainable and limited.
```

The most important distinction:

```text
Paper discussion needs public accountability.
Mentor/group experience needs verified anonymity.
```

Chinese version:

```text
论文讨论需要公开责任。
导师与课题组体验需要验证匿名。
```

---

## 14. Final Vision

SiliconScope should become:

```text
the intelligence layer for IC research decisions
```

It should help users answer:

```text
What should I read?
Which topic is growing?
Who is active in this field?
Which institution is strong here?
Which professor fits my research goal?
Which research group environment may suit me?
Where is the IC research landscape moving?
```

This is the long-term commercial value.

SiliconScope is not just a better paper search tool.

It is a platform for understanding integrated-circuit research.
