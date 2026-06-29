# SiliconScope Content Expansion Plan

SiliconScope v2 already has a dense feature surface. The next product lift is content quality: deeper IC taxonomy, stronger provenance, verified entity profiles, and refresh workflows that turn the database into a trusted research and learning product instead of a pile of metadata.

## Content Principles

- Separate facts, inference, and opinion. A paper DOI is a fact; mentor-school membership may be inferred; student reviews are opinion and require moderation.
- Prefer IC-specific structure over generic academic search fields.
- Make every high-value page answer: what is it, why does it matter, who works on it, where is it strong, what papers prove it, and what should I read next.
- Treat every content item as versioned. Weekly updates should create diffs, not silently change rankings.
- Keep public/demo content metadata-only; private paid modes can unlock workflow depth, watchlists, exports, and private notes.

## Content Maturity Levels

| Level | Meaning | Example |
| --- | --- | --- |
| L0 raw | Imported but not cleaned | OpenAlex paper row with title/year/venue only |
| L1 normalized | Basic aliases, venue rank, topic label, DOI/source IDs cleaned | Paper can appear in search and venue matrix |
| L2 enriched | Abstract, affiliations, citations, related entities, confidence flags | Paper can support topic/company/profile pages |
| L3 curated | Human or trusted-source reviewed; errors corrected; provenance visible | Institution aliases, venue policy, professor affiliation |
| L4 productized | Has narrative, explanation, diagrams, learning links, comparisons, and user actions | Learning route, company profile, topic report |
| L5 monetizable | Reliable enough for paid workflows, API/export, alerts, and institutional comparison | Verified research report, weekly alert, vetted professor profile |

## Highest-Value Content Gaps

| Area | Current state | What to add next | Why it matters |
| --- | --- | --- | --- |
| Paper corpus | Large local metadata corpus with heuristic ranks and topics | Source completeness dashboard by venue/year, DOI/IEEE article verification, abstract coverage, affiliation confidence | Makes search and rankings defensible |
| Topic taxonomy | Hierarchical seed, DB projection, and heuristic paper-topic edges exist | Sample review, manual correction, and UI exposure for topic confidence | Fixes misclassification and enables better filters |
| Learning routes | 23 routes and 38 daily lessons exist | Route depth map, representative paper bundles, equations/figures checklist, project outputs, bilingual lesson bodies | Turns learning from a directory into a product |
| Mentor profiles | Inferred professor pages and reviews exist | Verified faculty source, current affiliation, role/title, lab homepage, career timeline, publication-stage explanation | Needed before public-facing mentor intelligence |
| Institution profiles | Publication-derived pages exist | Alias audit, department/lab split, city/country verification, subfield strength and trend explanations | Makes school ranking less noisy |
| Company intelligence | Seeded company directory exists | Product-node mapping, fab/process nodes, EDA/IP/tool stack, job signals, related papers, public sources per field | Connects research to jobs and industry |
| Geo intelligence | Country/region map exists | City-level geocoding, institution coordinates, regional trend snapshots, uncertainty display | Makes maps useful rather than decorative |
| Venue matrix | Venue/year/domain matrix exists | Venue policy explanations, hidden/low-weight venue rationale, completeness warning, rank-change history | Prevents rankings from being skewed by odd venues |
| Reports/exports | Deterministic exports exist | Topic/institution/company report templates with caveats and evidence tables | A natural paid feature |
| Community content | Comments/reviews/moderation exist | Review quality prompts, abuse taxonomy, verified reviewer badges, public/private visibility rules | Needed for safe user-generated content |

## IC Taxonomy Expansion

### Circuit And System Routes

- Analog fundamentals: op-amp, comparator, reference, bias, LDO, oscillator, filter, layout matching, noise.
- Data converters: SAR ADC, pipelined ADC, delta-sigma ADC, time-domain ADC, DAC, calibration, FoM interpretation.
- Clocking: integer/fractional-N PLL, ADPLL, DLL, CDR, jitter/noise transfer, DTC/TDC, injection locking.
- PMIC: buck, boost, buck-boost, switched-capacitor converter, hybrid converter, LDO, charger, energy harvesting.
- RF/mmWave: LNA, mixer, PA, VCO, phased array, beamforming, radar, wireless transceiver, front-end module.
- Wireline/SerDes: equalization, CDR, PAM4, ADC/DSP-based receiver, clocking, package/channel co-design.
- Memory/CIM: SRAM, DRAM, MRAM, RRAM, ReRAM, SRAM-CIM, analog CIM, digital CIM, macro benchmarking.
- Sensor/Bio/Imaging: AFE, neural interface, ultrasound, MEMS, image sensor, display driver.
- Digital SoC: RTL, microarchitecture, NoC, accelerator, memory hierarchy, low-power design.
- Backend/verification: synthesis, place-route, timing closure, DFT, CDC/RDC, formal, UVM.

### Device, Manufacturing, And Packaging

- CMOS device basics, FinFET/GAA, process integration, reliability, variability, aging, ESD.
- Power devices: GaN, SiC, BCD, high-voltage integration.
- Packaging: 2.5D/3D, chiplet, interposer, HBM, thermal, signal integrity, power integrity.
- Equipment/materials: lithography, etch, deposition, metrology, wafer, photoresist, gases, CMP.

### Commercial Content Objects

Each company should eventually have:

- business type, country/city, website, public source links
- product lines and technology keywords
- process nodes or EDA/IP/tool roles where applicable
- related papers and institutions
- job roles, interview topics, and learning-roadmap links
- competitors, suppliers, customers, and partner relations when sourced
- confidence score and last-reviewed timestamp

## Content Graph Model

Long term, route pages, paper pages, company pages, mentor pages, and institution pages should all read from the same content graph.

```text
Paper
  -> Venue / Year / DOI / Source
  -> Authors -> Author Identity -> Mentor Profile
  -> Affiliations -> Institution Identity -> Geo Region
  -> Topics -> Learning Routes -> Daily Lessons
  -> Companies by affiliation, keyword, product, and career role
  -> Reports, watchlists, notes, and exports
```

Recommended new projection tables after the current registry stabilizes:

- `topic_nodes`, `topic_aliases`, `topic_keyword_rules`: implemented DB projection for the curated IC hierarchy and matching hints.
- `paper_topic_edges`: implemented heuristic-v1 classifier output with confidence and evidence JSON; next step is review UI and manual correction.
- `entity_source_claims`: source-backed facts for authors, institutions, and companies.
- `content_quality_findings`: review queue for missing abstracts, conflicting aliases, suspicious affiliations, and low-confidence topics.
- `report_templates`: reusable deterministic report sections.

## Near-Term Implementation Order

1. Add a content-quality dashboard that counts missing abstracts, unknown affiliations, low-confidence topics, duplicate authors, duplicate institutions, and company profiles without sources.
2. Review `paper_topic_edges` samples for obvious cases such as DC-DC/PMIC, PLL/clocking, SAR ADC/data converters, SRAM/CIM/memory, and PA/LNA/RF.
3. Add admin manual correction for topic aliases, keyword rules, and paper-topic edges.
4. Add representative paper bundles to each learning route and expose them as a reading queue action.
5. Add source-backed company facts: website, headquarters, employee count, product lines, and confidence.
6. Add venue-year completeness warnings so rankings show whether a missing year is a data gap.
7. Add mentor/institution verification queues before treating inferred affiliations as final.
8. Add report templates for topic, institution, company, and mentor comparison pages.

## What Should Wait

- Full professor biography, photos, and career movement should wait for IEEE/API plus faculty-homepage crawling.
- Paid report exports should wait until source/provenance display is good.
- Public review/community growth should wait until moderation, rate limits, and abuse handling are stricter.
- AI reading and summarization should wait until metadata provenance, PDF policy, and API cost controls are stable.

## Weekly Content Refresh Flow

```text
1. Create SQLite backup
2. Import new metadata by venue/year/provider
3. Normalize DOI, venue, aliases, topics, affiliations, and companies
4. Run content-quality checks and produce a diff
5. Refresh snapshots and rankings
6. Rebuild Meilisearch indexes
7. Publish dashboard summary and admin review queues
```

This flow keeps the private workflow fast while making the public product trustworthy enough for paid research, learning, and industry-intelligence features.
