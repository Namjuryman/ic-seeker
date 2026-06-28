# SiliconScope Learning Content Strategy

SiliconScope learning content should not be a loose course list. It should become a structured IC knowledge graph that connects study routes, daily circuit lessons, papers, mentors, institutions, companies, tools, and jobs.

## Current Coverage

The current backend seed catalog contains:

- 24 IC learning routes
- 35 daily circuit lessons
- 5 route families
- route-specific prerequisites, staged goals, reading queries, venues, foundations, outcomes, and project prompts

The canonical source is:

```text
backend/src/data/learning-catalog.ts
```

## Route Families

### Circuit Design

This family covers transistor-level and signal-chain design:

- Analog & Mixed-Signal
- Data Converters / ADC / DAC
- Clocking / PLL / Frequency Synthesis
- High-Speed Wireline / SerDes
- RF/mmWave & Wireless
- Power Management
- Biomedical / Sensor / MEMS Interfaces
- Image Sensors / Display Driver IC

Why it was expanded: analog, ADC, PLL, SerDes, RF, PMIC, and sensor IC use different metrics, design loops, papers, and interview questions. Keeping them in one analog bucket makes the roadmap too vague.

### Digital Systems

This family covers digital implementation and architecture:

- Digital ASIC / SoC
- Digital Backend / Physical Design / Signoff
- Verification / DFT
- Architecture / Accelerator
- FPGA / Reconfigurable Computing

Why it was expanded: RTL, verification, architecture, and backend are different career paths. A strong commercial product should let users choose between design, verification, PD, and architecture instead of treating all of them as "digital".

### Device And Manufacturing

This family connects IC design to physical technology:

- Devices / Process / 3D Integration
- Semiconductor Manufacturing / Equipment / Materials
- Power Devices
- Advanced Packaging / Chiplet

Why it was expanded: manufacturing, equipment, process, devices, and packaging increasingly affect circuit performance. This route family is also useful for company intelligence and job-market mapping.

### Tools, Security, And Reliability

This family covers engineering infrastructure and product trust:

- Analog Layout / PEX / Physical Verification
- EDA / CAD / Verification Tools
- Hardware Security
- Automotive IC / Reliability / Functional Safety

Why it was expanded: layout, signoff, reliability, safety, and security are not optional side topics in real IC products. They deserve independent route pages and company/job matching.

### Frontier Routes

This family covers long-term interdisciplinary directions:

- Memory / Compute-in-Memory
- Silicon Photonics
- Quantum / Neuromorphic / Emerging IC

Why it remains compact: these areas are important, but SiliconScope should first make core IC routes deep and reliable. Frontier routes can later be split by memory type, photonics link type, and emerging device stack.

## Content Depth Targets

Each route should eventually include:

- prerequisites split into math, physics, circuits, systems, tools, and paper-reading skills
- 3 to 5 learning stages with concrete output requirements
- representative papers from ISSCC, JSSC, VLSI, CICC, ESSCIRC, ASSCC, DAC, ICCAD, IEDM, IRPS, and other relevant venues
- key figures and equations that a reader should recognize
- typical metrics, tradeoffs, traps, and debugging workflows
- suggested tools and datasets
- professor/institution/company links from the local database
- interview topics and job-role mapping
- beginner, intermediate, and research-level project ideas

## Daily Circuit Lessons

Daily lessons should be short, visual, and database-connected. Each lesson should answer:

- What is the block doing?
- What are the important equations or timing relationships?
- Which metrics matter?
- What usually breaks in silicon?
- Which papers are worth reading next?
- Which route does this lesson belong to?

The current 35 lessons cover seed topics for ADC, PLL, SerDes, layout, backend, process, reliability, PMIC, RF, memory, and device routes. The next expansion should add hand-drawn or generated diagrams and short Chinese/English explanations.

## Next Content Work

Short term:

- Move route and lesson content from TypeScript seed files into editable database tables.
- Add an admin editor for routes, stages, prerequisites, lessons, diagrams, and reading lists.
- Add route-level representative diagrams and thumbnails.
- Add progress placeholders: mark completed, review later, and add related papers to reading queue.

Medium term:

- Add verified paper bundles for each route.
- Add route-to-company and route-to-job matching.
- Add difficulty ladders without labeling routes as "better" or "worse".
- Add bilingual content fields so Chinese and English pages can diverge naturally where needed.

Long term:

- Build a route knowledge graph across papers, authors, institutions, companies, tools, and jobs.
- Use weekly paper ingestion to update route recommendations.
- Use local PDF reading history to recommend next lessons and papers.
- Add structured quizzes, design checks, and interview-prep packs.

## Content Rules

- Avoid school-specific course tables in the default public content.
- Mark inferred content as inferred.
- Prefer concrete IC artifacts: circuits, metrics, papers, tools, layouts, timing diagrams, and silicon failure modes.
- Keep route pages career-useful but not purely job-oriented.
- Do not let broad labels hide important differences between subfields.
