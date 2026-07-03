import { sqlite } from "../db/connection.js";
import { learningService } from "./learning.service.js";

type CircuitPayload = {
  problem: string;
  intuition: string;
  minimalBlock: string;
  equations: string[];
  specs: string[];
  tradeoffs: string[];
  pitfalls: string[];
  paperDirections: string[];
  searches: string[];
  quiz: string[];
  next: string;
  caveat: string;
};

const topicRecipes: Array<{ test: RegExp; kind: string; payload: Partial<CircuitPayload> }> = [
  {
    test: /sar|adc|fom|sigma|converter/i,
    kind: "data-converter",
    payload: {
      intuition: "A data converter is a disciplined trade between thermal noise, quantization, comparator decision time, capacitor mismatch, and digital calibration. Read every ADC paper as a budget allocation problem, not just a topology name.",
      minimalBlock: "Input sampler -> DAC/residue path -> comparator/amplifier -> digital logic/calibration -> output code",
      equations: ["ENOB = (SNDR - 1.76) / 6.02", "Walden FoM = Power / (2^ENOB * fs)", "kT/C noise sets a lower bound on sampling capacitance"],
      specs: ["SNDR/ENOB at input frequency", "sampling rate", "power", "area", "calibration overhead", "process node"],
      pitfalls: ["Comparing Nyquist and oversampling converters with one FoM", "Ignoring calibration power", "Missing input frequency and measurement bandwidth"],
      paperDirections: ["ISSCC/JSSC ADC survey tables", "SAR capacitor DAC mismatch calibration", "delta-sigma loop stability and quantizer noise shaping"],
    },
  },
  {
    test: /pll|phase noise|jitter|adpll|clock/i,
    kind: "clocking",
    payload: {
      intuition: "A PLL turns noisy oscillator phase into a controlled timing resource by shaping reference noise, divider noise, oscillator noise, and quantization noise across loop bandwidth.",
      minimalBlock: "Reference -> PFD/TDC -> loop filter/digital filter -> VCO/DCO -> divider -> feedback",
      equations: ["Integrated jitter comes from integrating phase-noise spectral density over the stated offset band", "Loop bandwidth trades reference tracking against VCO noise suppression", "Spur mechanisms often come from periodic quantization, mismatch, or supply modulation"],
      specs: ["rms jitter", "phase noise offsets", "spur level", "power", "frequency range", "lock time"],
      pitfalls: ["Quoting jitter without integration band", "Comparing ring and LC oscillators without area/frequency context", "Ignoring supply pushing and reference spur"],
      paperDirections: ["ADPLL TDC/DTC quantization", "jitter-cleaning PLLs", "fractional-N spur mitigation"],
    },
  },
  {
    test: /ldo|dc-dc|buck|boost|power|pmic|converter classification/i,
    kind: "power-management",
    payload: {
      intuition: "PMIC design is control-loop engineering under real load, package, efficiency, and transient constraints. Topology choice matters, but compensation and parasitics often decide silicon behavior.",
      minimalBlock: "Power stage -> error sensing -> compensation/control -> gate driver/pass device -> output capacitor/load",
      equations: ["Efficiency = Pout / Pin", "Load-transient undershoot depends on loop bandwidth, output capacitance, and current slew", "PSRR is frequency dependent and collapses near loop bandwidth or pass-device limits"],
      specs: ["efficiency curve", "load transient", "line/load regulation", "PSRR", "quiescent current", "inductor/capacitor assumptions"],
      pitfalls: ["Single-point peak efficiency marketing", "Omitting external passives", "Not separating small-signal stability from large-signal transient"],
      paperDirections: ["hybrid switched-capacitor converters", "digital control PMIC", "fast-transient LDOs"],
    },
  },
  {
    test: /serdes|pam4|cdr|equalization|eye/i,
    kind: "wireline",
    payload: {
      intuition: "A wireline link spends power to recover timing and symbols through a lossy channel. The eye diagram is a compact picture of channel loss, jitter, equalization, and decision margin.",
      minimalBlock: "TX driver/equalizer -> channel/package -> CTLE/VGA -> CDR -> slicer/DFE -> digital adaptation",
      equations: ["UI = 1 / data_rate", "BER target determines required eye margin", "Equalization boosts signal but can amplify noise or error propagation"],
      specs: ["Gb/s per lane", "pJ/bit", "BER", "channel loss", "jitter tolerance", "adaptation method"],
      pitfalls: ["Comparing links at different channel loss", "Ignoring test pattern and BER extrapolation", "Treating PAM4 and NRZ margins as interchangeable"],
      paperDirections: ["PAM4 CDR", "DFE adaptation", "chiplet die-to-die links"],
    },
  },
  {
    test: /rf|mmwave|noise figure|phased|lna|transceiver/i,
    kind: "rf-mmwave",
    payload: {
      intuition: "RF IC papers are about preserving information while moving impedance, frequency, phase, and noise around. Always read gain/noise/linearity together.",
      minimalBlock: "Antenna/matching -> LNA/mixer/PLL -> baseband/filter/ADC or PA/driver -> package/antenna interface",
      equations: ["Friis formula explains why first-stage NF dominates", "IIP3 captures third-order linearity under two-tone assumptions", "Array gain and phase error shape beamforming performance"],
      specs: ["noise figure", "gain", "IIP3/P1dB", "phase noise", "EVM", "band/frequency", "array size"],
      pitfalls: ["Frequency and bandwidth omitted in comparisons", "Package/antenna loss hidden outside chip metrics", "NF/gain/linearity reported at different bias points"],
      paperDirections: ["mmWave phased arrays", "low-power BLE/Wi-Fi transceivers", "RF front-end co-design"],
    },
  },
  {
    test: /sram|memory|cim|compute/i,
    kind: "memory-cim",
    payload: {
      intuition: "Memory and CIM papers trade density, stability, sensing margin, ADC overhead, and workload mapping. A great CIM result must survive system-level energy accounting.",
      minimalBlock: "Bitcell array -> wordline/bitline -> sense/ADC -> peripheral digital accumulation -> memory controller",
      equations: ["Read static noise margin depends on cell ratio and variation", "CIM energy must include ADC/DAC, drivers, and accumulation", "TOPS/W is workload and precision dependent"],
      specs: ["bitcell area", "Vmin", "read/write margin", "precision", "ADC overhead", "macro vs system energy"],
      pitfalls: ["Counting only array energy", "Ignoring retraining/accuracy loss", "Comparing different bit precision or sparsity assumptions"],
      paperDirections: ["SRAM Vmin assist", "analog CIM ADC sharing", "RRAM/MRAM compute macros"],
    },
  },
  {
    test: /rtl|asic|systolic|tops|soc|cdc|fsm/i,
    kind: "digital-architecture",
    payload: {
      intuition: "Digital IC work turns workload structure into data movement, parallelism, timing closure, and verification cost. The expensive part is often moving bits, not computing them.",
      minimalBlock: "Workload model -> datapath -> memory hierarchy -> control/NoC -> verification/timing/power closure",
      equations: ["Throughput = operations per cycle * frequency", "Energy = compute energy + memory movement + clock/control overhead", "Utilization matters more than peak TOPS"],
      specs: ["frequency", "area", "power", "memory bandwidth", "utilization", "benchmark setup", "process node"],
      pitfalls: ["Peak TOPS without utilization", "Ignoring off-chip memory", "Not separating post-layout from pre-layout numbers"],
      paperDirections: ["AI accelerator dataflows", "RISC-V SoC integration", "near-memory compute"],
    },
  },
  {
    test: /eda|placement|routing|sta|verification|dft|assertion|coverage/i,
    kind: "eda-verification",
    payload: {
      intuition: "EDA and verification papers must be read by objective, constraint set, benchmark, and failure mode. A better average metric is not enough without reproducibility and corner coverage.",
      minimalBlock: "Design database -> constraints -> algorithm/model -> signoff metric -> reproducibility/evaluation harness",
      equations: ["Optimization target is often weighted wirelength/timing/power/congestion", "Coverage = exercised behavior / intended behavior", "False confidence comes from benchmark leakage"],
      specs: ["benchmark suite", "runtime", "QoR", "corner setup", "open-source reproducibility", "industrial realism"],
      pitfalls: ["Benchmark overfitting", "Unclear constraints", "Missing ablation or runtime scaling"],
      paperDirections: ["ML for placement/routing", "formal verification", "DFT/ATPG/BIST"],
    },
  },
];

const fallbackPayload: CircuitPayload = {
  problem: "Map the circuit/system concept to a concrete IC design decision, then identify which paper metadata, specs, and venues usually contain credible evidence.",
  intuition: "Read this topic as an engineering trade-space: what physical limit, architecture choice, measurement setup, and application constraint are being balanced?",
  minimalBlock: "Problem -> circuit/system block -> dominant non-ideality -> measurement metric -> paper comparison table",
  equations: ["Write the first-order relationship before reading the paper", "List assumptions next to every equation", "Check whether reported metrics use the same conditions"],
  specs: ["process node", "supply", "frequency/bandwidth", "power", "area", "measurement condition", "application target"],
  tradeoffs: ["performance vs power", "area vs robustness", "calibration vs analog precision", "benchmark simplicity vs real deployment"],
  pitfalls: ["Comparing papers with missing conditions", "Treating metadata-based indicators as final evaluation", "Ignoring source completeness and venue scope"],
  paperDirections: ["Start with representative papers", "Build a metric table", "Track venue/year trend before choosing a project"],
  searches: ["integrated circuit", "solid-state circuit"],
  quiz: ["What is the dominant non-ideality?", "Which metric would fail first on silicon?", "Which paper comparison is unfair and why?"],
  next: "Add two related papers to Reading Queue and write one paragraph summarizing the metric assumptions.",
  caveat: "Educational content. Verify equations, measurements, and design advice with primary papers, textbooks, datasheets, and mentors.",
};

function mergePayload(title: string, lesson: any): CircuitPayload {
  const recipe = topicRecipes.find((item) => item.test.test(title) || item.test.test((lesson.relatedTopics || []).join(" ")) || item.test.test((lesson.relatedSearchQueries || []).join(" ")));
  const base = { ...fallbackPayload, ...(recipe?.payload || {}) };
  return {
    ...base,
    problem: `${title}: ${base.problem}`,
    tradeoffs: base.tradeoffs?.length ? base.tradeoffs : fallbackPayload.tradeoffs,
    searches: lesson.relatedSearchQueries?.length ? lesson.relatedSearchQueries : base.searches,
    quiz: base.quiz?.length ? base.quiz : fallbackPayload.quiz,
    caveat: fallbackPayload.caveat,
  };
}

function dayIndex(date = new Date()) {
  const start = Date.UTC(2026, 0, 1);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.max(0, Math.floor((now - start) / 86_400_000));
}

function enrich(lesson: any, index = 0) {
  const payload = mergePayload(lesson.title, lesson);
  return {
    id: `daily-${lesson.id}`,
    lessonId: lesson.id,
    title: lesson.title,
    roadmapSlug: lesson.roadmapSlug,
    roadmap: lesson.roadmap || null,
    level: lesson.level,
    estimatedMinutes: lesson.estimatedMinutes,
    displayOrder: index,
    circuitKind: topicRecipes.find((item) => item.test.test(lesson.title))?.kind || "concept",
    relatedTopics: lesson.relatedTopics || [],
    relatedVenues: lesson.relatedVenues || [],
    relatedSearchQueries: lesson.relatedSearchQueries || [],
    payload,
    actions: {
      openLesson: `/learning/lessons/${encodeURIComponent(lesson.id)}`,
      relatedPapers: `/api/learning/lessons/${encodeURIComponent(lesson.id)}/related-papers`,
      addToReadingQueue: true,
      saveToWatchlist: true,
      reviewCadence: ["tomorrow", "in_7_days", "in_30_days"],
    },
  };
}

function parsePayload(value: unknown): CircuitPayload | null {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export const dailyCircuitService = {
  list(params: { roadmapSlug?: string; limit?: number } = {}) {
    const lessons = learningService.listLessons(params.roadmapSlug ? { roadmapSlug: params.roadmapSlug } : {}) as any[];
    const limit = Math.max(1, Math.min(200, Number(params.limit || lessons.length || 40)));
    return {
      generatedAt: new Date().toISOString(),
      total: lessons.length,
      rows: lessons.slice(0, limit).map((lesson, idx) => enrich(lesson, idx)),
      caveat: fallbackPayload.caveat,
    };
  },

  today(date = new Date()) {
    const lessons = learningService.listLessons({}) as any[];
    if (!lessons.length) return null;
    const index = dayIndex(date) % lessons.length;
    return {
      generatedAt: new Date().toISOString(),
      dayIndex: dayIndex(date),
      item: enrich(lessons[index], index),
      nextReviewIntervals: [1, 7, 30],
      caveat: fallbackPayload.caveat,
    };
  },

  get(id: string) {
    const cleanId = id.startsWith("daily-") ? id.slice("daily-".length) : id;
    const manual = sqlite.prepare("SELECT * FROM daily_circuit_items WHERE id = ? OR lesson_id = ?").get(id, cleanId) as any;
    if (manual) {
      const payload = parsePayload(manual.payload_json) || fallbackPayload;
      return {
        id: manual.id,
        lessonId: manual.lesson_id,
        title: manual.title,
        roadmapSlug: manual.roadmap_slug,
        circuitKind: manual.circuit_kind,
        displayOrder: manual.display_order,
        payload,
        status: manual.status,
        caveat: fallbackPayload.caveat,
      };
    }
    const lesson = learningService.getLesson(cleanId) as any;
    return lesson ? enrich(lesson) : null;
  },

  syncSeed() {
    const lessons = learningService.listLessons({}) as any[];
    const stmt = sqlite.prepare(`
      INSERT INTO daily_circuit_items (id, lesson_id, title, topic_id, roadmap_slug, circuit_kind, payload_json, status, display_order, created_at, updated_at)
      VALUES (@id, @lessonId, @title, @topicId, @roadmapSlug, @circuitKind, @payloadJson, 'published', @displayOrder, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        roadmap_slug = excluded.roadmap_slug,
        circuit_kind = excluded.circuit_kind,
        payload_json = excluded.payload_json,
        display_order = excluded.display_order,
        updated_at = CURRENT_TIMESTAMP
    `);
    const tx = sqlite.transaction((rows: any[]) => {
      rows.forEach((lesson, idx) => {
        const item = enrich(lesson, idx);
        stmt.run({
          id: item.id,
          lessonId: item.lessonId,
          title: item.title,
          topicId: item.relatedTopics[0] || null,
          roadmapSlug: item.roadmapSlug,
          circuitKind: item.circuitKind,
          payloadJson: JSON.stringify(item.payload),
          displayOrder: idx,
        });
      });
    });
    tx(lessons);
    return { ok: true, synced: lessons.length, generatedAt: new Date().toISOString() };
  },
};
