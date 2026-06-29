export type RoadmapLevel = "foundation" | "intermediate" | "advanced" | "research";
export type LessonLevel = "starter" | "core" | "advanced" | "paper-reading" | "research-frontier";

export interface LearningResource {
  title: string;
  kind: "course" | "book" | "tool" | "paper" | "guide";
  provider: string;
  url: string;
  note: string;
}

export interface PrerequisitesGroup {
  title: string;
  note: string;
  items: string[];
}

export interface RoadmapModule {
  id: string;
  title: string;
  purpose: string;
  lessonPlaceholders: string[];
  relatedKeywords: string[];
  relatedPaperQueries: string[];
}

export interface RoadmapStage {
  id: string;
  title: string;
  goal: string;
  modules: RoadmapModule[];
  checkpoints?: string[];
  resources?: LearningResource[];
}

export interface LearningRoadmapSeed {
  slug: string;
  title: string;
  shortTitle: string;
  domain: string;
  level: RoadmapLevel;
  description: string;
  targetUsers: string[];
  prerequisites: string[];
  stages: RoadmapStage[];
  relatedTopics: string[];
  relatedVenues: string[];
  relatedSearchQueries: string[];
  caveat: string;
  family?: string;
  accent?: string;
  subtitle?: string;
  paperQuery?: string;
  venues?: string[];
  foundation?: string[];
  prerequisitesGroups?: PrerequisitesGroup[];
  outcomes?: string[];
  projectIdeas?: string[];
}

export interface RouteFamilySeed {
  id: string;
  title: string;
  description: string;
  routeIds: string[];
}

export interface FoundationGroupSeed {
  title: string;
  note: string;
  items: string[];
}

export interface DailyLessonSeed {
  id: string;
  title: string;
  roadmapSlug: string;
  moduleId: string;
  level: LessonLevel;
  estimatedMinutes: number;
  sectionPlaceholders: Record<string, string>;
  relatedTopics: string[];
  relatedSearchQueries: string[];
  relatedVenues: string[];
}

type RouteSeed = {
  slug: string;
  title: string;
  shortTitle: string;
  domain: string;
  family: string;
  level: RoadmapLevel;
  accent: string;
  subtitle: string;
  description: string;
  foundation: string[];
  prerequisiteGroups: PrerequisitesGroup[];
  outcomes: string[];
  stages: Array<{
    id: string;
    title: string;
    goal: string;
    modules: Array<{
      id: string;
      title: string;
      purpose: string;
      tasks: string[];
      keywords: string[];
      queries: string[];
    }>;
    checkpoints: string[];
    resources?: LearningResource[];
  }>;
  venues: string[];
  topics: string[];
  queries: string[];
  projectIdeas: string[];
};

const caveat = "Learning content is a curated engineering guide. Use it to plan study, paper reading, and project work; verify equations, specs, and design advice with textbooks, datasheets, papers, and mentors before tape-out or publication.";

const targetUsers = ["IC students", "research interns", "graduate researchers", "industry engineers"];

const guide = (title: string, provider: string, url: string, note: string): LearningResource => ({
  title,
  kind: "guide",
  provider,
  url,
  note,
});

const paper = (title: string, query: string, note: string): LearningResource => ({
  title,
  kind: "paper",
  provider: "SiliconScope local search",
  url: `/?q=${encodeURIComponent(query)}&scope=all&semantic=1`,
  note,
});

const book = (title: string, provider: string, url: string, note: string): LearningResource => ({
  title,
  kind: "book",
  provider,
  url,
  note,
});

const tool = (title: string, provider: string, url: string, note: string): LearningResource => ({
  title,
  kind: "tool",
  provider,
  url,
  note,
});

function route(seed: RouteSeed): LearningRoadmapSeed {
  return {
    slug: seed.slug,
    title: seed.title,
    shortTitle: seed.shortTitle,
    domain: seed.domain,
    level: seed.level,
    family: seed.family,
    accent: seed.accent,
    subtitle: seed.subtitle,
    description: seed.description,
    targetUsers,
    prerequisites: seed.foundation,
    foundation: seed.foundation,
    prerequisitesGroups: seed.prerequisiteGroups,
    stages: seed.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      goal: stage.goal,
      checkpoints: stage.checkpoints,
      resources: stage.resources,
      modules: stage.modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        purpose: mod.purpose,
        lessonPlaceholders: mod.tasks,
        relatedKeywords: mod.keywords,
        relatedPaperQueries: mod.queries,
      })),
    })),
    relatedTopics: seed.topics,
    relatedVenues: seed.venues,
    relatedSearchQueries: seed.queries,
    venues: seed.venues,
    paperQuery: seed.queries.join(" OR "),
    outcomes: seed.outcomes,
    projectIdeas: seed.projectIdeas,
    caveat,
  };
}

const commonPrereq = (items: string[]): PrerequisitesGroup[] => [
  {
    title: "Before starting",
    note: "These are the minimum ideas that make the route readable.",
    items: items.slice(0, Math.ceil(items.length / 2)),
  },
  {
    title: "Build while reading",
    note: "Add these gradually through papers, tools, and small projects.",
    items: items.slice(Math.ceil(items.length / 2)),
  },
];

const analogResources = [
  book("Design of Analog CMOS Integrated Circuits", "B. Razavi", "https://www.mheducation.com/highered/product/design-analog-cmos-integrated-circuits-razavi/M9780072524932.html", "Core analog CMOS reference."),
  guide("Murmann ADC Performance Survey", "B. Murmann", "https://github.com/bmurmann/ADC-survey", "Excellent bridge from metrics to real data-converter papers."),
];

export const learningRoadmaps: LearningRoadmapSeed[] = [
  route({
    slug: "analog-mixed-signal",
    title: "Analog and Mixed-Signal IC",
    shortTitle: "Analog IC",
    domain: "Analog & Mixed-Signal",
    family: "ic-design",
    level: "advanced",
    accent: "#dc2626",
    subtitle: "Op-amps, references, filters, ADC/DAC interfaces, PLL support blocks, layout, noise, mismatch, and measurement.",
    description: "The central route for students who want to read ISSCC/JSSC analog papers and eventually design transistor-level circuits.",
    foundation: ["Circuit analysis", "MOS small-signal model", "Feedback and stability", "Noise and mismatch", "SPICE simulation", "Layout matching"],
    prerequisiteGroups: commonPrereq(["Circuit analysis", "Analog electronics", "MOS device physics", "Feedback theory", "Probability and noise", "Cadence/Virtuoso flow", "Monte Carlo simulation", "Post-layout extraction"]),
    outcomes: ["Read analog IC paper metrics without getting lost", "Build behavioral and transistor-level simulation loops", "Connect schematic, layout, parasitics, and measurement"],
    stages: [
      {
        id: "analog-foundation",
        title: "Stage 1: transistor intuition",
        goal: "Turn MOS equations into circuit intuition for gain, headroom, noise, and bandwidth.",
        modules: [
          { id: "mos-small-signal", title: "MOS small-signal model", purpose: "Know what changes when bias, length, current, and topology change.", tasks: ["Derive gm, ro, intrinsic gain", "Compare common-source and source follower", "Run a bias sweep in SPICE"], keywords: ["MOS", "small signal", "intrinsic gain"], queries: ["MOS small signal analog IC"] },
          { id: "diff-feedback", title: "Differential pair and feedback", purpose: "Understand why most analog blocks are feedback systems.", tasks: ["Analyze a differential pair", "Draw loop gain for a two-stage op-amp", "Explain phase margin"], keywords: ["differential pair", "feedback", "stability"], queries: ["opamp loop stability compensation"] },
        ],
        checkpoints: ["Explain gain-bandwidth trade-off", "Read a simple op-amp schematic", "Identify mismatch-sensitive devices"],
        resources: analogResources,
      },
      {
        id: "analog-core-blocks",
        title: "Stage 2: reusable analog blocks",
        goal: "Master the blocks that appear in ADC, PLL, PMIC, sensor, and RF papers.",
        modules: [
          { id: "bias-mirrors", title: "Biasing and current mirrors", purpose: "Build stable references and bias distribution.", tasks: ["Compare simple/cascode mirrors", "Estimate output resistance", "Simulate PVT corners"], keywords: ["current mirror", "bias", "bandgap"], queries: ["current mirror mismatch bandgap reference"] },
          { id: "noise-linearity", title: "Noise and linearity", purpose: "Relate device noise to circuit and system specs.", tasks: ["Calculate input-referred noise", "Compare thermal/flicker noise", "Explain distortion terms"], keywords: ["noise", "linearity", "distortion"], queries: ["analog IC input referred noise linearity"] },
        ],
        checkpoints: ["Create a block-level spec table", "Explain the dominant noise source", "Run corners and Monte Carlo"],
        resources: [paper("Analog building-block papers", "opamp bandgap reference low noise amplifier analog IC", "Use paper search after the block vocabulary is clear.")],
      },
      {
        id: "analog-layout-test",
        title: "Stage 3: layout and silicon reality",
        goal: "Learn why clean schematics fail after layout, package, and measurement.",
        modules: [
          { id: "layout-matching", title: "Matching layout", purpose: "Translate mismatch theory into geometry and placement.", tasks: ["Draw common-centroid arrays", "List guard-ring use cases", "Compare pre/post-PEX results"], keywords: ["layout matching", "common centroid", "PEX"], queries: ["common centroid analog layout matching"] },
        ],
        checkpoints: ["Write a test plan", "Explain parasitic-induced poles", "Identify likely silicon debug probes"],
        resources: [tool("Cadence custom IC flow", "Cadence", "https://www.cadence.com/en_US/home/tools/custom-ic-analog-rf-design.html", "Industry tool chain reference.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "VLSI Symposium", "CICC", "A-SSCC", "ESSERC"],
    topics: ["Analog & Mixed-Signal", "Clocking & Frequency Generation", "Power Management"],
    queries: ["analog IC", "opamp", "bandgap reference", "low noise analog front-end", "mixed-signal"],
    projectIdeas: ["Build a two-stage op-amp design notebook", "Create a paper metric table for bandgap references", "Classify analog papers by block and spec"],
  }),
  route({
    slug: "data-converters",
    title: "Data Converters: ADC and DAC",
    shortTitle: "ADC / DAC",
    domain: "Analog & Mixed-Signal",
    family: "ic-design",
    level: "advanced",
    accent: "#ef4444",
    subtitle: "SAR, pipeline, delta-sigma, time-interleaved ADCs, DAC linearity, calibration, FoM, and measurement.",
    description: "A focused route for students who want to understand converter papers rather than only memorizing FoM tables.",
    foundation: ["Sampling theory", "Comparator basics", "Capacitor DACs", "Noise shaping", "Calibration", "Measurement metrics"],
    prerequisiteGroups: commonPrereq(["Sampling and quantization", "Switch-cap circuits", "Comparator noise", "CDAC mismatch", "DSP basics", "FFT/SNDR/ENOB", "Layout matching", "Clock jitter"]),
    outcomes: ["Read ENOB/SNDR/FoM correctly", "Distinguish SAR, pipeline, delta-sigma, and TI ADC trade-offs", "Build fair benchmark tables"],
    stages: [
      {
        id: "converter-metrics",
        title: "Stage 1: converter language",
        goal: "Understand what ADC/DAC specs really measure.",
        modules: [
          { id: "adc-metrics", title: "SNDR, ENOB, FoM", purpose: "Avoid comparing papers with incompatible assumptions.", tasks: ["Convert SNDR to ENOB", "Compare Walden and Schreier FoM", "List test input assumptions"], keywords: ["SNDR", "ENOB", "FoM"], queries: ["ADC FoM ENOB SNDR Walden Schreier"] },
        ],
        checkpoints: ["Explain why FoM can be misleading", "Read an FFT plot", "Build a converter metric sheet"],
        resources: [guide("Murmann ADC Performance Survey", "B. Murmann", "https://github.com/bmurmann/ADC-survey", "Use it as the benchmark backbone.")],
      },
      {
        id: "converter-architectures",
        title: "Stage 2: architectures",
        goal: "See why architecture choice depends on bandwidth, resolution, power, and process.",
        modules: [
          { id: "sar-adc", title: "SAR ADC", purpose: "Understand binary search, CDAC switching, and comparator limits.", tasks: ["Draw charge redistribution", "Compare switching schemes", "Read a SAR ADC paper"], keywords: ["SAR ADC", "CDAC", "comparator"], queries: ["SAR ADC capacitor DAC comparator calibration"] },
          { id: "pipeline-dsm", title: "Pipeline and delta-sigma", purpose: "Understand residue amplification and noise shaping.", tasks: ["Draw MDAC residue", "Explain noise transfer function", "Compare CTSD and DT DSM"], keywords: ["pipeline ADC", "delta-sigma", "noise shaping"], queries: ["pipeline ADC delta sigma ADC noise shaping"] },
        ],
        checkpoints: ["Classify a converter title correctly", "Explain the main power bottleneck", "Identify calibration type"],
        resources: [paper("Converter papers", "SAR ADC pipeline ADC delta-sigma ADC calibration", "Search representative recent work.")],
      },
      {
        id: "converter-calibration-test",
        title: "Stage 3: calibration and test",
        goal: "Connect circuit nonidealities to digital correction and measurement setup.",
        modules: [
          { id: "ti-adc", title: "Time-interleaving and calibration", purpose: "Understand offset, gain, and timing skew correction.", tasks: ["Derive timing-skew effect", "List background calibration signals", "Compare foreground/background calibration"], keywords: ["time-interleaved ADC", "timing skew", "calibration"], queries: ["time interleaved ADC skew calibration"] },
        ],
        checkpoints: ["Explain calibration convergence", "List measurement equipment", "Avoid double-counting digital power"],
        resources: [paper("Calibration papers", "ADC background calibration time interleaved skew", "Use metadata search to build a reading queue.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "VLSI Symposium", "CICC"],
    topics: ["Analog & Mixed-Signal", "ADC", "Clocking & Frequency Generation"],
    queries: ["ADC", "SAR ADC", "pipeline ADC", "delta-sigma ADC", "time-interleaved ADC"],
    projectIdeas: ["Create an ADC benchmark table", "Build a SAR ADC behavioral model", "Write a note on FoM traps"],
  }),
  route({
    slug: "mixed-signal-system-integration",
    title: "Mixed-Signal IC Integration",
    shortTitle: "Mixed-Signal",
    domain: "Analog & Mixed-Signal",
    family: "ic-design",
    level: "advanced",
    accent: "#e11d48",
    subtitle: "Analog-digital boundaries, calibration loops, clock/reset crossings, sensor/ADC/PLL/PMIC integration, mixed-signal verification, and silicon bring-up.",
    description: "A route for understanding the real glue between analog blocks, digital control, firmware-visible registers, calibration, clocks, power domains, and verification. It is the missing bridge between pure analog design and pure RTL/SoC work.",
    foundation: ["Analog blocks", "Digital logic", "Sampling", "Clock domains", "Register maps", "Mixed-signal simulation"],
    prerequisiteGroups: [
      {
        title: "Analog side",
        note: "Know what the analog block is trying to guarantee before digital calibration touches it.",
        items: ["Op-amp/comparator basics", "ADC/DAC metrics", "PLL jitter", "PMIC loop behavior", "Noise and mismatch", "PEX awareness"],
      },
      {
        title: "Digital/control side",
        note: "Know how calibration, control, and observability are represented in a chip.",
        items: ["FSM and counters", "CDC/reset handling", "Register maps", "Scan/DFT basics", "Firmware hooks", "Assertions and coverage"],
      },
    ],
    outcomes: ["Design mixed-signal control and calibration hooks", "Read papers that combine circuit innovation with digital assistance", "Plan verification and bring-up for analog-heavy SoCs"],
    stages: [
      {
        id: "ms-boundaries",
        title: "Stage 1: analog-digital boundaries",
        goal: "Identify every boundary where continuous-time behavior becomes sampled, quantized, timed, or digitally controlled.",
        modules: [
          { id: "sample-clock-reset", title: "Sampling, clocks, and resets", purpose: "Avoid treating mixed-signal blocks as clean synchronous RTL.", tasks: ["Draw sample/hold timing", "List async reset risks", "Map clock domains"], keywords: ["mixed-signal", "sampling", "clock domain", "reset"], queries: ["mixed-signal IC sampling clock domain reset"] },
          { id: "register-control", title: "Register-controlled analog", purpose: "Expose trim, mode, calibration, and debug hooks safely.", tasks: ["Draft a register map", "List trim bits", "Separate production and debug modes"], keywords: ["register map", "trim", "calibration"], queries: ["mixed-signal calibration trim register map IC"] },
        ],
        checkpoints: ["Draw an analog/digital boundary map", "Explain metastability risk in a mixed-signal block", "List registers needed for silicon debug"],
        resources: [paper("Digitally assisted analog papers", "digitally assisted analog calibration mixed-signal IC", "Search digitally assisted analog and calibration papers.")],
      },
      {
        id: "ms-calibration",
        title: "Stage 2: calibration and adaptation",
        goal: "Understand how digital loops correct analog nonidealities without hiding bad measurements.",
        modules: [
          { id: "foreground-background-cal", title: "Foreground and background calibration", purpose: "Choose the right calibration style for ADC, PLL, SerDes, RF, and PMIC blocks.", tasks: ["Compare foreground/background loops", "List convergence observables", "Define calibration stop criteria"], keywords: ["foreground calibration", "background calibration", "adaptation"], queries: ["background calibration mixed-signal ADC PLL SerDes"] },
          { id: "bist-observability", title: "BIST and observability", purpose: "Make silicon measurable after packaging.", tasks: ["List analog observability points", "Define production-test hooks", "Plan debug counters"], keywords: ["BIST", "observability", "silicon debug"], queries: ["mixed-signal BIST analog observability silicon debug"] },
        ],
        checkpoints: ["Explain convergence vs tracking", "Avoid calibration benchmark traps", "Write a bring-up checklist"],
        resources: [paper("Calibration-heavy papers", "ADC PLL SerDes calibration mixed-signal ISSCC JSSC", "Use recent papers to see calibration patterns.")],
      },
      {
        id: "ms-verification-bringup",
        title: "Stage 3: verification and bring-up",
        goal: "Plan simulation, emulation, validation, and lab debug for chips with analog cores and digital control.",
        modules: [
          { id: "ams-verification", title: "AMS verification", purpose: "Balance transistor simulation, behavioral models, RTL simulation, and assertions.", tasks: ["Write model fidelity levels", "Define pass/fail specs", "Add assertions around control loops"], keywords: ["AMS verification", "behavioral model", "assertion"], queries: ["AMS verification behavioral model mixed-signal IC"] },
          { id: "lab-bringup", title: "Lab bring-up", purpose: "Connect measurement setup to design intent.", tasks: ["Write power-up sequence", "List measurement equipment", "Define debug experiments"], keywords: ["silicon bring-up", "measurement", "debug"], queries: ["mixed-signal silicon bring-up measurement debug"] },
        ],
        checkpoints: ["Create a mixed-signal verification plan", "Define model fidelity levels", "Write first-silicon bring-up sequence"],
        resources: [tool("Verilog-AMS overview", "Accellera", "https://www.accellera.org/downloads/standards/v-ams", "Language context for analog/mixed-signal modeling.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "CICC", "VLSI Symposium", "ASSCC", "ESSCIRC"],
    topics: ["Analog & Mixed-Signal", "ADC", "Clocking & Frequency Generation", "Power Management", "EDA, CAD & Verification"],
    queries: ["mixed-signal IC", "digitally assisted analog", "background calibration", "AMS verification", "silicon bring-up"],
    projectIdeas: ["Create a mixed-signal register map for a SAR ADC", "Write an AMS verification plan for a PLL", "Build a calibration taxonomy across ADC/PLL/SerDes papers"],
  }),
  route({
    slug: "clocking-pll-timing",
    title: "Clocking, PLL, and Timing",
    shortTitle: "PLL / Clocking",
    domain: "Clocking & Frequency Generation",
    family: "ic-design",
    level: "advanced",
    accent: "#f97316",
    subtitle: "Charge-pump PLL, ADPLL, fractional-N, MDLL, injection locking, jitter, phase noise, spur, and clock distribution.",
    description: "A route for understanding timing circuits that appear in RF, wireline, digital SoC, and data-converter systems.",
    foundation: ["Control theory", "Phase noise", "Oscillators", "Frequency synthesis", "Jitter integration", "Digital calibration"],
    prerequisiteGroups: commonPrereq(["Feedback loops", "Laplace transform", "Noise spectral density", "Oscillator basics", "Sampling", "Digital filters", "TDC/DTC concepts", "Clock tree basics"]),
    outcomes: ["Convert phase noise to jitter", "Understand PLL architecture choices", "Read spur and lock-time specs"],
    stages: [
      {
        id: "pll-language",
        title: "Stage 1: phase-noise language",
        goal: "Make phase noise, jitter, spur, and lock time concrete.",
        modules: [
          { id: "pll-noise-language", title: "Phase noise to jitter", purpose: "Translate plots into time-domain system impact.", tasks: ["Integrate phase-noise curve", "Compare random jitter and deterministic jitter", "Explain reference spur"], keywords: ["phase noise", "jitter", "spur"], queries: ["PLL phase noise integrated jitter spur"] },
        ],
        checkpoints: ["Read phase-noise plots", "Explain jitter bandwidth", "List main spur sources"],
        resources: [paper("PLL metric papers", "PLL phase noise jitter spur clock generator", "Start from metric-heavy papers.")],
      },
      {
        id: "pll-architectures",
        title: "Stage 2: architecture choices",
        goal: "Understand why CPPLL, ADPLL, fractional-N, MDLL, and injection locking exist.",
        modules: [
          { id: "adpll", title: "ADPLL and DTC", purpose: "Map time-domain quantization to spur and jitter.", tasks: ["Draw ADPLL signal path", "Explain TDC/DTC resolution", "Compare digital loop filters"], keywords: ["ADPLL", "TDC", "DTC"], queries: ["ADPLL DTC TDC spur resolution"] },
          { id: "fractional-n", title: "Fractional-N PLL", purpose: "Understand quantization noise and sigma-delta modulation.", tasks: ["Draw fractional divider", "Explain DSM noise shaping", "List fractional spur mechanisms"], keywords: ["fractional-N", "sigma-delta", "divider"], queries: ["fractional-N PLL sigma delta spur"] },
        ],
        checkpoints: ["Classify PLL architecture from title", "Explain dominant noise source", "Read lock-time specs"],
        resources: [book("RF Microelectronics", "B. Razavi", "https://www.pearson.com/en-us/subject-catalog/p/rf-microelectronics/P200000003188", "Useful oscillator and PLL intuition.")],
      },
      {
        id: "pll-system",
        title: "Stage 3: system timing",
        goal: "Connect clock generation to SerDes, ADC, RF, and digital timing closure.",
        modules: [
          { id: "clock-distribution", title: "Clock distribution", purpose: "Understand skew, supply noise, duty cycle, and distribution buffers.", tasks: ["Draw a clock tree", "Compare local/global jitter", "List supply pushing paths"], keywords: ["clock distribution", "skew", "supply noise"], queries: ["clock distribution jitter supply noise IC"] },
        ],
        checkpoints: ["Explain jitter allocation", "Build a timing budget", "Identify system-level clock bottlenecks"],
        resources: [paper("Clocking papers", "clock generator PLL MDLL injection locking", "Search clocking papers across venues.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "VLSI Symposium", "CICC"],
    topics: ["Clocking & Frequency Generation", "Analog & Mixed-Signal", "RF/mmWave & Wireline"],
    queries: ["PLL", "ADPLL", "fractional-N PLL", "MDLL", "clock generator", "phase noise"],
    projectIdeas: ["Build a phase-noise-to-jitter calculator", "Classify PLL papers by architecture", "Create a spur source checklist"],
  }),
  route({
    slug: "wireline-serdes",
    title: "Wireline and SerDes",
    shortTitle: "SerDes",
    domain: "RF/mmWave & Wireline",
    family: "ic-design",
    level: "advanced",
    accent: "#2563eb",
    subtitle: "High-speed links, channels, equalization, CDR, PAM4, clocking, measurement, and die-to-die interfaces.",
    description: "The bridge between analog, clocking, digital signal processing, package channels, and system bandwidth.",
    foundation: ["Transmission lines", "Eye diagram", "Equalization", "CDR", "Clock jitter", "DSP"],
    prerequisiteGroups: commonPrereq(["Signals and systems", "S-parameters", "Transmission lines", "Sampling", "PLL basics", "Linear equalization", "Decision feedback", "PAM4 metrics"]),
    outcomes: ["Read eye diagrams and bathtub curves", "Understand CTLE/DFE/CDR trade-offs", "Connect channel loss to equalizer design"],
    stages: [
      {
        id: "wireline-channel",
        title: "Stage 1: channel and eye",
        goal: "Understand channel loss, ISI, eye opening, and link budget.",
        modules: [
          { id: "eye-diagram", title: "Eye diagram", purpose: "Make link quality visible.", tasks: ["Draw ISI impact", "Read eye height/width", "Compare NRZ and PAM4"], keywords: ["eye diagram", "ISI", "PAM4"], queries: ["SerDes eye diagram PAM4 equalization"] },
        ],
        checkpoints: ["Explain insertion loss", "Read an eye diagram", "Build a simple channel model"],
        resources: [paper("SerDes papers", "SerDes wireline PAM4 equalizer CDR", "Search wireline papers.")],
      },
      {
        id: "wireline-phy",
        title: "Stage 2: PHY circuits",
        goal: "Understand transmitter, receiver, equalization, and CDR blocks.",
        modules: [
          { id: "equalization", title: "Equalization", purpose: "Use TX FFE, CTLE, and DFE to fight channel loss.", tasks: ["Compare FFE/CTLE/DFE", "Explain DFE feedback timing", "List adaptation signals"], keywords: ["FFE", "CTLE", "DFE"], queries: ["SerDes FFE CTLE DFE adaptation"] },
          { id: "cdr", title: "Clock and data recovery", purpose: "Recover timing from noisy data.", tasks: ["Draw CDR loop", "Explain Alexander phase detector", "Compare baud-rate and oversampling CDR"], keywords: ["CDR", "phase detector", "jitter"], queries: ["clock data recovery SerDes PAM4"] },
        ],
        checkpoints: ["Map papers to TX/RX/CDR blocks", "Explain adaptation loops", "Read BER specs"],
        resources: [guide("UCIe specification", "UCIe Consortium", "https://www.uciexpress.org/specification", "Useful context for die-to-die link targets.")],
      },
      {
        id: "wireline-test-system",
        title: "Stage 3: measurement and system",
        goal: "Connect circuits to package, test, equalization training, and system constraints.",
        modules: [
          { id: "link-measurement", title: "Measurement and compliance", purpose: "Understand why link papers emphasize test setup.", tasks: ["List BERT/scope requirements", "Explain de-embedding", "Compare BER and bathtub"], keywords: ["BERT", "bathtub", "de-embedding"], queries: ["wireline SerDes measurement BER bathtub"] },
        ],
        checkpoints: ["Write a test plan", "Explain de-embedding", "Build a link budget table"],
        resources: [tool("Keysight digital communication analyzer resources", "Keysight", "https://www.keysight.com/us/en/products/oscilloscopes/digital-communications-analyzers.html", "Measurement context for high-speed links.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "VLSI Symposium", "OFC"],
    topics: ["RF/mmWave & Wireline", "Clocking & Frequency Generation", "Digital IC & Architecture"],
    queries: ["SerDes", "wireline", "PAM4", "CDR", "equalizer", "die-to-die"],
    projectIdeas: ["Build a toy channel/equalizer notebook", "Create a SerDes paper taxonomy", "Compare PAM4 link papers by data rate and pJ/bit"],
  }),
  route({
    slug: "rf-mmwave",
    title: "RF and mmWave IC",
    shortTitle: "RF/mmWave",
    domain: "RF/mmWave & Wireline",
    family: "ic-design",
    level: "advanced",
    accent: "#1d4ed8",
    subtitle: "LNA, mixer, VCO, PA, phased array, beamforming, RF measurement, EM, package, and system budgets.",
    description: "A route for moving from low-frequency circuit intuition to RF/mmWave reality, where matching, S-parameters, noise figure, linearity, EM layout, package parasitics, phased arrays, and measurement setups all become part of the design.",
    foundation: ["Impedance matching", "S-parameters", "Noise figure", "Linearity", "Oscillators", "EM simulation"],
    prerequisiteGroups: commonPrereq(["Analog circuits", "Electromagnetics", "S-parameters", "Smith chart", "Noise figure", "Linearity", "PLL basics", "Spectrum analysis"]),
    outcomes: ["Read RF receiver/transmitter chain papers", "Understand LNA/PA/mixer/VCO trade-offs", "Connect EM/package/test to silicon results"],
    stages: [
      {
        id: "rf-metrics",
        title: "Stage 1: RF language",
        goal: "Learn matching, S-parameters, NF, IIP3, P1dB, and PAE.",
        modules: [
          { id: "rf-metrics-module", title: "Metrics and matching", purpose: "Turn RF plots into design choices.", tasks: ["Read S11/S21", "Calculate cascaded NF", "Explain P1dB/IIP3"], keywords: ["S-parameter", "noise figure", "linearity"], queries: ["RFIC noise figure IIP3 S-parameter"] },
        ],
        checkpoints: ["Use a Smith chart", "Explain NF vs gain", "Read PA efficiency plots"],
        resources: [book("RF Microelectronics", "B. Razavi", "https://www.pearson.com/en-us/subject-catalog/p/rf-microelectronics/P200000003188", "Classic RFIC path.")],
      },
      {
        id: "rf-blocks",
        title: "Stage 2: RF blocks",
        goal: "Understand LNA, mixer, oscillator, PA, and synthesizer blocks.",
        modules: [
          { id: "lna-mixer", title: "LNA and mixer", purpose: "Place gain, noise, and linearity in the receiver chain.", tasks: ["Draw receiver cascade", "Compare passive/active mixer", "Read an LNA paper"], keywords: ["LNA", "mixer", "receiver"], queries: ["LNA mixer RF receiver IC"] },
          { id: "pa-vco", title: "PA and VCO", purpose: "Understand efficiency, phase noise, and frequency generation.", tasks: ["Compare PA classes", "Explain load-pull", "Read VCO phase-noise plots"], keywords: ["PA", "VCO", "phase noise"], queries: ["power amplifier VCO mmWave IC"] },
        ],
        checkpoints: ["Classify RF paper blocks", "Create RF chain budget", "Explain why layout is part of the circuit"],
        resources: [paper("RF/mmWave papers", "RFIC mmWave phased-array power amplifier LNA mixer", "Search RF work across ISSCC/JSSC/RFIC.")],
      },
      {
        id: "rf-mmwave-array",
        title: "Stage 3: mmWave arrays and measurement",
        goal: "Understand beamforming, phased arrays, packaging, and test.",
        modules: [
          { id: "phased-array", title: "Phased array", purpose: "Scale RF chains into beam-steering systems.", tasks: ["Explain phase shifter resolution", "Draw array front-end", "Compare beamforming locations"], keywords: ["phased array", "beamforming", "mmWave"], queries: ["mmWave phased-array beamforming IC"] },
        ],
        checkpoints: ["Read EIRP and beam plots", "Explain de-embedding", "List probe station requirements"],
        resources: [guide("Keysight RF measurement basics", "Keysight", "https://www.keysight.com/us/en/assets/7018-06840/application-notes/5952-0292.pdf", "Measurement perspective.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "RFIC", "IMS", "T-MTT", "ESSERC"],
    topics: ["RF/mmWave & Wireline", "Clocking & Frequency Generation", "Analog & Mixed-Signal"],
    queries: ["RFIC", "mmWave", "phased-array", "power amplifier", "LNA", "mixer"],
    projectIdeas: ["Create RF metrics flashcards", "Build a receiver cascade calculator", "Compare recent phased-array papers"],
  }),
  route({
    slug: "power-management",
    title: "Power Management IC",
    shortTitle: "PMIC",
    domain: "Power Management",
    family: "ic-design",
    level: "advanced",
    accent: "#f59e0b",
    subtitle: "LDO, buck, boost, switched-capacitor, hybrid converters, charge pumps, battery management, efficiency, transient, and EMI.",
    description: "The route for DC-DC, LDO, and system power delivery. Classification must treat converter papers as PMIC, not RF.",
    foundation: ["Feedback", "Power electronics", "Control loops", "Switching loss", "Passive devices", "Thermal reliability"],
    prerequisiteGroups: commonPrereq(["Op-amp and error amplifier", "Loop compensation", "Inductor/capacitor energy", "PWM/PFM", "Switching loss", "Load transient", "PSRR", "Package parasitics"]),
    outcomes: ["Classify DC-DC/LDO papers correctly", "Read efficiency and transient plots", "Understand hybrid and switched-capacitor converter trade-offs"],
    stages: [
      {
        id: "pmic-basics",
        title: "Stage 1: regulators and loops",
        goal: "Build the language of LDOs, buck/boost converters, and control loops.",
        modules: [
          { id: "ldo", title: "LDO", purpose: "Understand dropout, PSRR, transient, and stability.", tasks: ["Draw LDO loop", "Explain pass device trade-offs", "Read PSRR/transient plot"], keywords: ["LDO", "PSRR", "transient"], queries: ["LDO PSRR load transient stability"] },
          { id: "buck-boost", title: "Buck and boost", purpose: "Understand energy transfer and switching modes.", tasks: ["Derive duty ratio", "Compare CCM/DCM", "Estimate switching loss"], keywords: ["buck", "boost", "DC-DC"], queries: ["buck converter boost converter DC-DC IC"] },
        ],
        checkpoints: ["Explain efficiency curve shape", "Read load transient plots", "Classify converter architecture"],
        resources: [paper("PMIC papers", "LDO DC-DC buck boost switched-capacitor converter PMIC", "Start with ISSCC/JSSC/CICC PMIC papers.")],
      },
      {
        id: "pmic-advanced",
        title: "Stage 2: hybrid and integrated converters",
        goal: "Understand why modern PMIC papers mix inductors, capacitors, digital control, and package constraints.",
        modules: [
          { id: "sc-hybrid", title: "Switched-capacitor and hybrid converters", purpose: "Understand conversion ratio, flying caps, and hybrid current paths.", tasks: ["Draw charge redistribution", "Compare SC and inductive paths", "Read dual-path hybrid papers"], keywords: ["switched capacitor", "hybrid converter", "dual-path"], queries: ["dual-path hybrid switched-capacitor converter"] },
        ],
        checkpoints: ["Explain conversion ratio", "Identify inductor current ripple reduction", "Map DPH papers to PMIC"],
        resources: [guide("IEEE TPEL", "IEEE", "https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=63", "Power electronics context beyond IC venues.")],
      },
      {
        id: "pmic-system",
        title: "Stage 3: system power",
        goal: "Connect silicon PMICs to SoC rails, battery, package, EMI, and reliability.",
        modules: [
          { id: "system-power", title: "System power map", purpose: "Understand multiple rails and workload-aware power.", tasks: ["Draw SoC rail map", "Explain DVFS", "List battery and safety constraints"], keywords: ["SoC power", "DVFS", "battery management"], queries: ["PMIC SoC power delivery battery management"] },
        ],
        checkpoints: ["Create a power tree", "Compare PMIC products", "Build a PMIC paper benchmark"],
        resources: [tool("LTspice", "Analog Devices", "https://www.analog.com/en/resources/design-tools-and-calculators/ltspice-simulator.html", "Useful for power converter intuition.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "CICC", "A-SSCC", "TCAS-I", "TPEL"],
    topics: ["Power Management", "Analog & Mixed-Signal"],
    queries: ["PMIC", "LDO", "DC-DC converter", "buck converter", "switched-capacitor converter", "hybrid converter"],
    projectIdeas: ["Build a converter classification rule set", "Create a PMIC institution ranking audit", "Make an efficiency/transient benchmark table"],
  }),
  route({
    slug: "sensor-bio-interface",
    title: "Sensor, Bioelectronics, and Imaging Interfaces",
    shortTitle: "Sensor AFE",
    domain: "Biomedical, Sensor & Imaging IC",
    family: "ic-design",
    level: "advanced",
    accent: "#10b981",
    subtitle: "AFE, neural recording, image sensor readout, MEMS interface, low-noise low-power acquisition, and system safety.",
    description: "The route for circuits that connect silicon to physical, biological, optical, and mechanical signals.",
    foundation: ["Low-noise amplifiers", "Filtering", "ADC", "Sensor physics", "Biopotential signals", "Low-power systems"],
    prerequisiteGroups: commonPrereq(["Analog noise", "Instrumentation amplifiers", "Filters", "Sensor physics", "ADC basics", "Chopper/auto-zero", "CMOS image sensors", "Safety constraints"]),
    outcomes: ["Read input-referred noise specs", "Separate sensor physics from readout circuits", "Plan low-power AFE projects"],
    stages: [
      {
        id: "sensor-afe",
        title: "Stage 1: low-noise front ends",
        goal: "Build AFE intuition for weak signals.",
        modules: [
          { id: "afe-noise", title: "AFE noise", purpose: "Understand input-referred noise, impedance, and filtering.", tasks: ["Calculate input-referred noise", "Compare chopper and auto-zero", "Draw ECG/EEG AFE"], keywords: ["AFE", "input-referred noise", "chopper"], queries: ["sensor AFE input referred noise biomedical IC"] },
        ],
        checkpoints: ["Read AFE noise tables", "Explain offset reduction", "Map signal bandwidth"],
        resources: [paper("Sensor AFE papers", "sensor interface AFE neural recording biomedical IC", "Search sensor and biomedical circuits.")],
      },
      {
        id: "sensor-systems",
        title: "Stage 2: sensor systems",
        goal: "Connect circuits to electrochemical, capacitive, optical, MEMS, and image sensors.",
        modules: [
          { id: "sensor-physics", title: "Sensor physics to circuit", purpose: "Translate physical signal into circuit requirements.", tasks: ["Compare capacitive/electrochemical/optical sensors", "Draw image sensor column readout", "List interface constraints"], keywords: ["sensor readout", "image sensor", "MEMS"], queries: ["CMOS image sensor column ADC MEMS readout"] },
        ],
        checkpoints: ["Separate sensor and AFE specs", "Explain column ADC use", "Read a neural interface paper"],
        resources: [guide("IEEE TBioCAS", "IEEE", "https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=4156126", "Bio-circuit and system papers.")],
      },
      {
        id: "sensor-product",
        title: "Stage 3: product constraints",
        goal: "Handle wearable, implantable, test, calibration, and reliability constraints.",
        modules: [
          { id: "sensor-productization", title: "Productization", purpose: "Understand battery, packaging, safety, and calibration needs.", tasks: ["Draw a wearable signal chain", "List calibration needs", "Compare wireless power options"], keywords: ["wearable", "implantable", "calibration"], queries: ["wearable biomedical IC implantable neural interface"] },
        ],
        checkpoints: ["Write a measurement plan", "Identify safety constraints", "Connect companies to sensor types"],
        resources: [guide("IEEE Sensors Journal", "IEEE", "https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=7361", "Broad sensor context.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "TBioCAS", "Sensors Journal", "MEMS", "Transducers"],
    topics: ["Biomedical, Sensor & Imaging IC", "Analog & Mixed-Signal", "ADC"],
    queries: ["sensor interface", "analog front-end", "neural recording", "CMOS image sensor", "MEMS readout"],
    projectIdeas: ["Create an AFE noise benchmark", "Map image-sensor readout architectures", "Build a sensor type to circuit requirement table"],
  }),
  route({
    slug: "digital-asic",
    title: "Digital ASIC and SoC",
    shortTitle: "ASIC / SoC",
    domain: "Digital IC & Architecture",
    family: "digital-system",
    level: "intermediate",
    accent: "#2563eb",
    subtitle: "RTL, microarchitecture, SoC integration, synthesis, timing, low power, verification, and handoff to backend.",
    description: "The path from logic and architecture to shippable digital silicon, covering RTL discipline, integration, timing awareness, low-power constraints, and the habit of reading silicon papers through area, power, performance, and verification evidence.",
    foundation: ["Digital logic", "Verilog/SystemVerilog", "Computer architecture", "Verification", "Synthesis", "Timing"],
    prerequisiteGroups: commonPrereq(["Boolean logic", "FSM", "Verilog RTL", "Testbench basics", "Computer organization", "Clock/reset", "Synthesis", "STA"]),
    outcomes: ["Write readable RTL", "Understand synthesis and timing reports", "Connect architecture to area/power/performance"],
    stages: [
      {
        id: "rtl-basics",
        title: "Stage 1: RTL discipline",
        goal: "Write synthesizable RTL and test it.",
        modules: [
          { id: "rtl-fsm", title: "RTL and FSM", purpose: "Build clean hardware state machines.", tasks: ["Write a UART or FIFO", "Build a testbench", "Run lint"], keywords: ["RTL", "FSM", "FIFO"], queries: ["digital ASIC RTL FSM FIFO"] },
        ],
        checkpoints: ["Avoid latch inference", "Explain blocking vs nonblocking", "Create a small reusable module"],
        resources: [guide("lowRISC style guides", "lowRISC", "https://github.com/lowRISC/style-guides", "Readable RTL conventions.")],
      },
      {
        id: "soc-flow",
        title: "Stage 2: SoC flow",
        goal: "Move from modules to buses, integration, timing, and low power.",
        modules: [
          { id: "soc-integration", title: "SoC integration", purpose: "Understand buses, interrupts, memory maps, and clock domains.", tasks: ["Draw a small SoC", "Add an AXI/APB peripheral", "Explain CDC"], keywords: ["SoC", "bus", "CDC"], queries: ["SoC integration clock domain crossing ASIC"] },
        ],
        checkpoints: ["Read synthesis reports", "Understand CDC risks", "Explain power domains"],
        resources: [tool("OpenROAD", "OpenROAD", "https://theopenroadproject.org/", "Open implementation flow for learning.")],
      },
      {
        id: "digital-papers",
        title: "Stage 3: architecture papers",
        goal: "Read accelerator and SoC papers with circuit-aware metrics.",
        modules: [
          { id: "digital-metrics", title: "Area, power, throughput", purpose: "Compare digital chips fairly.", tasks: ["Normalize TOPS/W", "Check technology node", "Compare memory bandwidth"], keywords: ["TOPS/W", "area", "throughput"], queries: ["AI accelerator SoC TOPS/W ISSCC"] },
        ],
        checkpoints: ["Spot unfair benchmark claims", "Link architecture to memory hierarchy", "Build a comparison table"],
        resources: [paper("Digital IC papers", "SoC ASIC processor accelerator ISSCC", "Search architecture silicon papers.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "DAC", "ICCAD", "ISCA", "MICRO"],
    topics: ["Digital IC & Architecture", "EDA, CAD & Verification"],
    queries: ["ASIC", "SoC", "digital IC", "processor", "accelerator", "RTL"],
    projectIdeas: ["Build a tiny SoC", "Write a timing report reading note", "Create a chip architecture benchmark"],
  }),
  route({
    slug: "digital-backend-physical-design",
    title: "Physical Design and Backend",
    shortTitle: "Backend",
    domain: "EDA, CAD & Verification",
    family: "digital-system",
    level: "intermediate",
    accent: "#0ea5e9",
    subtitle: "Synthesis, floorplan, placement, CTS, routing, STA, power integrity, signoff, and timing closure.",
    description: "The practical implementation route for turning RTL into GDS and understanding backend constraints.",
    foundation: ["RTL", "Logic synthesis", "STA", "Floorplanning", "Clock tree", "Routing"],
    prerequisiteGroups: commonPrereq(["Digital logic", "Verilog", "Timing paths", "Setup/hold", "Synthesis reports", "Floorplan", "Clock tree", "IR drop"]),
    outcomes: ["Read timing reports", "Understand setup/hold closure", "Connect physical constraints to architecture choices"],
    stages: [
      {
        id: "backend-timing",
        title: "Stage 1: timing reports",
        goal: "Understand setup, hold, slack, clocks, and constraints.",
        modules: [
          { id: "sta", title: "STA basics", purpose: "Read timing reports without guessing.", tasks: ["Explain launch/capture", "Read setup and hold paths", "Write simple constraints"], keywords: ["STA", "setup", "hold"], queries: ["STA setup hold timing report ASIC"] },
        ],
        checkpoints: ["Explain slack", "Identify false paths", "Understand clock uncertainty"],
        resources: [tool("OpenSTA", "OpenROAD", "https://github.com/The-OpenROAD-Project/OpenSTA", "Open static timing analyzer.")],
      },
      {
        id: "backend-implementation",
        title: "Stage 2: place and route",
        goal: "Understand floorplan, placement, CTS, routing, and congestion.",
        modules: [
          { id: "pnr", title: "Place and route", purpose: "Connect geometry to timing and power.", tasks: ["Run a toy OpenROAD design", "Read congestion map", "Compare CTS choices"], keywords: ["placement", "routing", "CTS"], queries: ["physical design placement routing CTS ASIC"] },
        ],
        checkpoints: ["Explain congestion", "Read utilization", "Understand clock skew"],
        resources: [tool("OpenROAD flow scripts", "OpenROAD", "https://github.com/The-OpenROAD-Project/OpenROAD-flow-scripts", "Hands-on backend flow.")],
      },
      {
        id: "backend-signoff",
        title: "Stage 3: signoff thinking",
        goal: "Handle extraction, IR/EM, DRC/LVS, and ECO closure.",
        modules: [
          { id: "signoff", title: "Signoff", purpose: "Understand what must be true before tape-out.", tasks: ["List signoff checks", "Explain IR drop", "Describe ECO flow"], keywords: ["signoff", "IR drop", "ECO"], queries: ["ASIC signoff IR drop ECO timing closure"] },
        ],
        checkpoints: ["Create signoff checklist", "Explain PEX impact", "Understand ECO trade-offs"],
        resources: [paper("Backend and EDA papers", "placement routing timing closure physical design", "Search CAD venues.")],
      },
    ],
    venues: ["DAC", "ICCAD", "DATE", "ISPD"],
    topics: ["EDA, CAD & Verification", "Digital IC & Architecture"],
    queries: ["physical design", "placement", "routing", "clock tree synthesis", "STA"],
    projectIdeas: ["Run OpenROAD on a small design", "Build a timing-report parser", "Make a backend signoff checklist"],
  }),
  route({
    slug: "verification-dft",
    title: "Verification and DFT",
    shortTitle: "Verification / DFT",
    domain: "EDA, CAD & Verification",
    family: "digital-system",
    level: "intermediate",
    accent: "#0284c7",
    subtitle: "Simulation, UVM, formal, assertions, coverage, CDC/RDC, scan, BIST, ATPG, and silicon debug.",
    description: "The route for proving chips work before and after silicon, from simulation and assertions to formal, CDC/RDC, scan, ATPG, BIST, and production-test thinking that decides whether a design can be trusted at scale.",
    foundation: ["SystemVerilog", "Assertions", "Coverage", "Formal basics", "DFT", "Debug"],
    prerequisiteGroups: commonPrereq(["RTL", "SystemVerilog", "Testbench", "Assertions", "Coverage", "Formal logic", "Scan chains", "Memory BIST"]),
    outcomes: ["Design verification plans", "Read coverage results", "Understand DFT and production test basics"],
    stages: [
      {
        id: "verification-foundation",
        title: "Stage 1: simulation and assertions",
        goal: "Build testbench and assertion discipline.",
        modules: [
          { id: "sv-assertions", title: "SystemVerilog assertions", purpose: "Turn intent into executable checks.", tasks: ["Write basic SVA", "Track functional coverage", "Debug failing waveform"], keywords: ["SVA", "coverage", "testbench"], queries: ["SystemVerilog assertions functional coverage verification"] },
        ],
        checkpoints: ["Write verification plan", "Explain coverage closure", "Debug a waveform"],
        resources: [guide("Verification Academy", "Siemens", "https://verificationacademy.com/", "Practical verification material.")],
      },
      {
        id: "formal-cdc",
        title: "Stage 2: formal and CDC",
        goal: "Use formal methods and CDC/RDC analysis for deep bugs.",
        modules: [
          { id: "formal-cdc", title: "Formal and CDC", purpose: "Catch bugs simulation may miss.", tasks: ["Write a formal property", "Explain synchronizers", "List CDC patterns"], keywords: ["formal", "CDC", "RDC"], queries: ["formal verification CDC RDC ASIC"] },
        ],
        checkpoints: ["Explain proof bounds", "Identify CDC crossings", "Use assertions in design review"],
        resources: [paper("Verification papers", "formal verification CDC DFT ASIC", "Search verification and CAD work.")],
      },
      {
        id: "dft-test",
        title: "Stage 3: DFT and silicon test",
        goal: "Understand scan, BIST, ATPG, and production test cost.",
        modules: [
          { id: "dft", title: "DFT", purpose: "Design chips that can be tested.", tasks: ["Explain scan insertion", "Compare stuck-at and transition faults", "Draw MBIST flow"], keywords: ["DFT", "scan", "ATPG"], queries: ["DFT scan ATPG BIST IC"] },
        ],
        checkpoints: ["Create DFT checklist", "Explain fault coverage", "Understand test time vs cost"],
        resources: [guide("IEEE ITC", "IEEE", "https://www.itctestweek.org/", "Test conference context.")],
      },
    ],
    venues: ["DAC", "ICCAD", "ITC", "DATE"],
    topics: ["EDA, CAD & Verification", "Digital IC & Architecture"],
    queries: ["verification", "UVM", "formal verification", "DFT", "scan", "ATPG"],
    projectIdeas: ["Write a UVM-lite testbench", "Build a CDC checklist", "Compare scan and MBIST flows"],
  }),
  route({
    slug: "architecture-accelerator",
    title: "Architecture and AI Accelerators",
    shortTitle: "Architecture",
    domain: "Digital IC & Architecture",
    family: "digital-system",
    level: "advanced",
    accent: "#4f46e5",
    subtitle: "CPU/GPU/NPU, dataflow, memory hierarchy, systolic arrays, sparsity, quantization, chiplets, and benchmark traps.",
    description: "The route for connecting algorithms to silicon architecture and reading accelerator papers critically.",
    foundation: ["Computer architecture", "Parallelism", "Memory hierarchy", "ML basics", "RTL", "Benchmarking"],
    prerequisiteGroups: commonPrereq(["Computer organization", "Cache/memory hierarchy", "Digital design", "Python modeling", "Linear algebra", "ML inference", "RTL basics", "Performance modeling"]),
    outcomes: ["Read accelerator papers beyond TOPS/W", "Understand memory bottlenecks", "Build fair benchmark comparisons"],
    stages: [
      {
        id: "arch-dataflow",
        title: "Stage 1: dataflow and memory",
        goal: "Understand why data movement dominates accelerator design.",
        modules: [
          { id: "systolic-array", title: "Systolic arrays", purpose: "Map matrix multiply to hardware.", tasks: ["Draw a systolic array", "Estimate reuse", "Compare weight/output/input stationary"], keywords: ["systolic array", "dataflow", "reuse"], queries: ["AI accelerator systolic array dataflow"] },
        ],
        checkpoints: ["Explain roofline", "Estimate memory bandwidth", "Classify dataflows"],
        resources: [paper("Accelerator papers", "AI accelerator systolic array dataflow memory hierarchy", "Search architecture papers with silicon data.")],
      },
      {
        id: "arch-precision",
        title: "Stage 2: precision and sparsity",
        goal: "Understand quantization, sparsity, compression, and accuracy trade-offs.",
        modules: [
          { id: "quant-sparse", title: "Quantization and sparsity", purpose: "See how model structure changes hardware.", tasks: ["Compare INT8/INT4/binary", "Estimate sparse overhead", "List accuracy risks"], keywords: ["quantization", "sparsity", "compression"], queries: ["AI accelerator quantization sparsity IC"] },
        ],
        checkpoints: ["Avoid misleading TOPS claims", "Normalize benchmarks", "Connect algorithm and hardware assumptions"],
        resources: [guide("MLPerf", "MLCommons", "https://mlcommons.org/benchmarks/", "Benchmark context.")],
      },
      {
        id: "arch-product",
        title: "Stage 3: product architecture",
        goal: "Connect chip architecture to package, software stack, and company strategy.",
        modules: [
          { id: "chip-product", title: "System product view", purpose: "Evaluate chips as products, not only papers.", tasks: ["Map software stack", "List memory/package constraints", "Compare cloud/edge needs"], keywords: ["chip product", "software stack", "HBM"], queries: ["AI accelerator HBM chiplet software stack"] },
        ],
        checkpoints: ["Create architecture-company map", "Compare datacenter vs edge", "Read product brief critically"],
        resources: [paper("ISSCC architecture silicon papers", "ISSCC AI accelerator SoC HBM chiplet", "Look for measured silicon, not only simulation.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "ISCA", "MICRO", "HPCA", "DAC"],
    topics: ["Digital IC & Architecture", "Memory & Compute-in-Memory"],
    queries: ["AI accelerator", "systolic array", "NPU", "processor", "memory hierarchy", "chiplet"],
    projectIdeas: ["Build a roofline calculator", "Create TOPS/W normalization notes", "Map accelerator companies by workload"],
  }),
  route({
    slug: "fpga-reconfigurable",
    title: "FPGA and Reconfigurable Computing",
    shortTitle: "FPGA",
    domain: "Digital IC & Architecture",
    family: "digital-system",
    level: "foundation",
    accent: "#3b82f6",
    subtitle: "FPGA fabrics, LUTs, BRAM, DSP blocks, timing closure, HLS, prototyping, and acceleration.",
    description: "A practical route for learning hardware design quickly and connecting prototypes to ASIC thinking.",
    foundation: ["Digital logic", "Verilog", "Timing", "Memory blocks", "DSP blocks", "Tool flow"],
    prerequisiteGroups: commonPrereq(["Digital logic", "Verilog", "Finite-state machines", "Clocking", "Constraints", "Python/C basics", "Fixed-point arithmetic", "Debug"]),
    outcomes: ["Prototype digital designs", "Understand timing closure", "Use FPGA as bridge to ASIC"],
    stages: [
      {
        id: "fpga-basics",
        title: "Stage 1: fabric and RTL",
        goal: "Understand what LUTs, FFs, BRAMs, DSPs, and routing resources mean.",
        modules: [
          { id: "fpga-fabric", title: "FPGA fabric", purpose: "Map RTL to configurable resources.", tasks: ["Implement FIFO", "Read utilization report", "Constrain clocks"], keywords: ["FPGA", "LUT", "BRAM"], queries: ["FPGA LUT BRAM timing closure"] },
        ],
        checkpoints: ["Explain utilization", "Read timing slack", "Debug with ILA"],
        resources: [tool("LiteX", "LiteX", "https://github.com/enjoy-digital/litex", "Open SoC builder for FPGA learning.")],
      },
      {
        id: "fpga-acceleration",
        title: "Stage 2: acceleration",
        goal: "Use FPGA for streaming, DSP, and prototype workloads.",
        modules: [
          { id: "fpga-streaming", title: "Streaming accelerator", purpose: "Learn pipeline, backpressure, and fixed-point design.", tasks: ["Build streaming FIR", "Use ready/valid", "Estimate throughput"], keywords: ["streaming", "pipeline", "fixed point"], queries: ["FPGA streaming accelerator fixed point"] },
        ],
        checkpoints: ["Explain initiation interval", "Avoid timing bottlenecks", "Compare HLS and RTL"],
        resources: [guide("Vitis HLS", "AMD Xilinx", "https://docs.amd.com/r/en-US/ug1399-vitis-hls", "HLS reference.")],
      },
      {
        id: "fpga-to-asic",
        title: "Stage 3: FPGA to ASIC thinking",
        goal: "Know what transfers to ASIC and what does not.",
        modules: [
          { id: "asic-bridge", title: "Prototype to ASIC", purpose: "Understand reset, CDC, verification, and physical reality.", tasks: ["List FPGA-only assumptions", "Prepare ASIC handoff checklist", "Compare timing models"], keywords: ["FPGA prototype", "ASIC", "handoff"], queries: ["FPGA prototyping ASIC verification"] },
        ],
        checkpoints: ["Identify FPGA-specific shortcuts", "Plan verification reuse", "Know when to switch to ASIC flow"],
        resources: [paper("Reconfigurable computing papers", "FPGA accelerator reconfigurable computing", "Search FPGA-related architecture work.")],
      },
    ],
    venues: ["FCCM", "FPGA", "FPL", "DAC", "ISCA"],
    topics: ["Digital IC & Architecture", "EDA, CAD & Verification"],
    queries: ["FPGA", "reconfigurable computing", "HLS", "FPGA accelerator", "timing closure"],
    projectIdeas: ["Build a streaming DSP accelerator", "Make FPGA-to-ASIC checklist", "Compare HLS and RTL implementations"],
  }),
  route({
    slug: "memory-cim",
    title: "Memory and Compute-in-Memory",
    shortTitle: "Memory / CIM",
    domain: "Memory & Compute-in-Memory",
    family: "ic-design",
    level: "research",
    accent: "#9333ea",
    subtitle: "SRAM, DRAM, Flash, MRAM, ReRAM, FeFET, analog/digital CIM, PIM, macro metrics, and system mapping.",
    description: "The route for understanding memory circuits and the research frontier around moving compute closer to data.",
    foundation: ["Memory bitcells", "Sense amplifiers", "ADC/DAC", "Device physics", "ML workloads", "Architecture evaluation"],
    prerequisiteGroups: commonPrereq(["SRAM bitcell", "Sense amplifier", "Memory hierarchy", "ADC/DAC basics", "Matrix multiply", "Device variability", "Quantization", "Benchmarking"]),
    outcomes: ["Separate memory, near-memory, and in-memory computing", "Read CIM macro metrics", "Understand accuracy/energy/area trade-offs"],
    stages: [
      {
        id: "memory-cells",
        title: "Stage 1: memory circuits",
        goal: "Understand bitcells, read/write, sensing, stability, and assist circuits.",
        modules: [
          { id: "sram", title: "SRAM", purpose: "Understand 6T cell operation and macro design.", tasks: ["Draw 6T SRAM", "Explain read disturb", "Read SRAM Vmin paper"], keywords: ["SRAM", "sense amplifier", "Vmin"], queries: ["6T SRAM read stability Vmin"] },
        ],
        checkpoints: ["Explain read/write margins", "Compare SRAM/DRAM/Flash", "Read memory macro specs"],
        resources: [paper("Memory macro papers", "SRAM DRAM memory macro JSSC ISSCC", "Start with measured memory macros.")],
      },
      {
        id: "cim-circuits",
        title: "Stage 2: CIM circuits",
        goal: "Understand analog MAC, digital bit-serial compute, ADC overhead, and calibration.",
        modules: [
          { id: "analog-cim", title: "Analog CIM", purpose: "Know the energy and accuracy bottlenecks.", tasks: ["Draw bitline MAC", "Estimate ADC overhead", "List nonidealities"], keywords: ["compute-in-memory", "CIM", "ADC overhead"], queries: ["analog compute in memory ADC overhead"] },
        ],
        checkpoints: ["Compare analog and digital CIM", "Read TOPS/W carefully", "Identify accuracy loss mechanisms"],
        resources: [paper("CIM papers", "compute-in-memory SRAM ReRAM macro TOPS/W", "Search ISSCC/JSSC CIM work.")],
      },
      {
        id: "cim-system",
        title: "Stage 3: system mapping",
        goal: "Connect macro claims to real neural-network workloads and memory traffic.",
        modules: [
          { id: "cim-mapping", title: "Mapping and benchmarking", purpose: "Evaluate whether macro numbers matter at system level.", tasks: ["Map a GEMM layer", "Estimate data movement", "Compare precision formats"], keywords: ["GEMM", "mapping", "precision"], queries: ["compute-in-memory system mapping benchmark"] },
        ],
        checkpoints: ["Normalize benchmark assumptions", "Identify missing overhead", "Build a CIM scorecard"],
        resources: [guide("MLPerf", "MLCommons", "https://mlcommons.org/benchmarks/", "System benchmark reference.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "IEDM", "VLSI Symposium", "DAC", "ISCA"],
    topics: ["Memory & Compute-in-Memory", "Digital IC & Architecture", "Devices, Process & 3D Integration"],
    queries: ["SRAM", "DRAM", "ReRAM", "MRAM", "compute-in-memory", "CIM"],
    projectIdeas: ["Build a CIM benchmark table", "Compare SRAM-CIM and ReRAM-CIM", "Audit TOPS/W claims across papers"],
  }),
  route({
    slug: "devices-process",
    title: "Devices, Process, and Integration",
    shortTitle: "Devices",
    domain: "Devices, Process & 3D Integration",
    family: "device-manufacturing",
    level: "advanced",
    accent: "#64748b",
    subtitle: "MOSFET scaling, FinFET/GAA, variability, reliability, process integration, TCAD, and device-circuit co-design.",
    description: "The route for understanding the physical limits behind circuit and architecture claims.",
    foundation: ["Semiconductor physics", "MOS devices", "Process modules", "Variability", "Reliability", "TCAD"],
    prerequisiteGroups: commonPrereq(["Semiconductor physics", "PN junctions", "MOS capacitor", "Short-channel effects", "Process flow", "Statistics", "Reliability", "TCAD basics"]),
    outcomes: ["Read IEDM/VLSI device papers", "Understand scaling claims", "Connect device limits to circuit behavior"],
    stages: [
      {
        id: "device-physics",
        title: "Stage 1: device physics",
        goal: "Understand MOSFET behavior and scaling effects.",
        modules: [
          { id: "mos-device", title: "MOS device fundamentals", purpose: "Connect IV curves to circuit models.", tasks: ["Explain threshold voltage", "Compare long/short channel", "Read Id-Vg/Id-Vd plots"], keywords: ["MOSFET", "threshold", "short-channel"], queries: ["MOSFET scaling short channel effects"] },
        ],
        checkpoints: ["Read device plots", "Explain leakage paths", "Understand variability sources"],
        resources: [book("Semiconductor Device Fundamentals", "R. F. Pierret", "https://www.pearson.com/en-us/subject-catalog/p/semiconductor-device-fundamentals/P200000003203", "Device foundation reference.")],
      },
      {
        id: "process-integration",
        title: "Stage 2: process integration",
        goal: "Understand how lithography, etch, deposition, CMP, and metrology become a process flow.",
        modules: [
          { id: "process-flow", title: "Process flow", purpose: "Read process integration papers.", tasks: ["Draw FEOL/BEOL flow", "List key process modules", "Explain overlay and CD"], keywords: ["process integration", "lithography", "metrology"], queries: ["semiconductor process integration lithography metrology"] },
        ],
        checkpoints: ["Explain process window", "Identify integration bottlenecks", "Read IEDM abstracts"],
        resources: [guide("International Roadmap for Devices and Systems", "IRDS", "https://irds.ieee.org/", "Roadmap context.")],
      },
      {
        id: "device-circuit",
        title: "Stage 3: device-circuit co-design",
        goal: "Connect device changes to SRAM, analog, RF, and digital constraints.",
        modules: [
          { id: "device-circuit-codesign", title: "Co-design", purpose: "Avoid reading device metrics in isolation.", tasks: ["Map device parameters to SRAM Vmin", "Explain analog headroom", "Compare RF ft/fmax impact"], keywords: ["device circuit co-design", "SRAM", "analog"], queries: ["device circuit co-design FinFET GAA SRAM analog"] },
        ],
        checkpoints: ["Explain PPA impact", "Read node comparison tables", "Understand reliability trade-offs"],
        resources: [paper("Device papers", "IEDM FinFET GAA device circuit co-design", "Search device papers and link to circuits.")],
      },
    ],
    venues: ["IEDM", "VLSI Symposium", "IRPS", "TCAD"],
    topics: ["Devices, Process & 3D Integration", "Memory & Compute-in-Memory"],
    queries: ["FinFET", "GAA", "device scaling", "process integration", "TCAD", "reliability"],
    projectIdeas: ["Create a device scaling glossary", "Map device papers to circuit impact", "Build a process module dependency chart"],
  }),
  route({
    slug: "power-devices",
    title: "Power Devices and Wide-Bandgap Semiconductors",
    shortTitle: "Power Devices",
    domain: "Devices, Process & 3D Integration",
    family: "device-manufacturing",
    level: "advanced",
    accent: "#b45309",
    subtitle: "Si, SiC, GaN, power MOSFETs, IGBTs, HEMTs, gate drivers, reliability, packaging, and system efficiency.",
    description: "The route for students connecting semiconductor devices to high-voltage and high-power systems.",
    foundation: ["Power electronics", "Device physics", "Thermal", "Reliability", "Gate driving", "Packaging"],
    prerequisiteGroups: commonPrereq(["PN junctions", "MOSFETs", "Power conversion", "Breakdown voltage", "Thermal resistance", "Reliability", "Gate drivers", "EMI"]),
    outcomes: ["Understand SiC/GaN trade-offs", "Read power device reliability papers", "Connect device parameters to converter behavior"],
    stages: [
      {
        id: "power-device-basics",
        title: "Stage 1: power device language",
        goal: "Understand Rds(on), breakdown, capacitance, switching loss, and safe operating area.",
        modules: [
          { id: "power-mosfet", title: "Power MOSFET metrics", purpose: "Map datasheet numbers to circuit behavior.", tasks: ["Compare Rds(on) and Qg", "Explain breakdown", "Estimate switching loss"], keywords: ["power MOSFET", "Rds(on)", "Qg"], queries: ["power MOSFET Rds on gate charge switching loss"] },
        ],
        checkpoints: ["Read a power device datasheet", "Explain FOM", "Estimate thermal limits"],
        resources: [guide("IEEE TPEL", "IEEE", "https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=63", "Power electronics application context.")],
      },
      {
        id: "wide-bandgap",
        title: "Stage 2: SiC and GaN",
        goal: "Understand why wide-bandgap devices are useful and difficult.",
        modules: [
          { id: "sic-gan", title: "SiC and GaN devices", purpose: "Compare device physics and system use cases.", tasks: ["Compare SiC/GaN applications", "Explain threshold instability", "List gate-driver needs"], keywords: ["SiC", "GaN", "HEMT"], queries: ["SiC GaN power semiconductor wide bandgap"] },
        ],
        checkpoints: ["Explain WBG benefits", "List reliability risks", "Connect gate driver to device"],
        resources: [paper("Wide-bandgap papers", "SiC GaN power semiconductor reliability gate driver", "Search WBG papers.")],
      },
      {
        id: "power-device-system",
        title: "Stage 3: device-package-system",
        goal: "Connect device, package, thermal, EMI, and converter design.",
        modules: [
          { id: "power-packaging", title: "Power packaging", purpose: "Understand parasitics and thermal bottlenecks.", tasks: ["Draw a power module", "Estimate thermal path", "Explain package inductance"], keywords: ["power module", "thermal", "package inductance"], queries: ["power semiconductor packaging thermal parasitic"] },
        ],
        checkpoints: ["Build device selection matrix", "Explain EMI paths", "Compare discrete vs module"],
        resources: [paper("Power device system papers", "power module SiC GaN packaging thermal EMI", "Search system-level device work.")],
      },
    ],
    venues: ["ISPSD", "IEDM", "VLSI Symposium", "TPEL", "IRPS"],
    topics: ["Devices, Process & 3D Integration", "Power Management"],
    queries: ["SiC", "GaN", "power semiconductor", "power MOSFET", "wide bandgap"],
    projectIdeas: ["Build a SiC/GaN application map", "Compare power device FOMs", "Create gate-driver requirement notes"],
  }),
  route({
    slug: "advanced-packaging",
    title: "Advanced Packaging and Chiplets",
    shortTitle: "Packaging / Chiplets",
    domain: "Devices, Process & 3D Integration",
    family: "device-manufacturing",
    level: "intermediate",
    accent: "#9333ea",
    subtitle: "2.5D/3D, HBM, interposer, UCIe, die-to-die links, thermal, yield, test, and heterogeneous integration.",
    description: "The route for understanding why modern systems are no longer only single-die SoCs.",
    foundation: ["SoC architecture", "Packaging basics", "Signal integrity", "Thermal", "High-speed I/O", "Yield"],
    prerequisiteGroups: commonPrereq(["SoC basics", "High-speed I/O", "Package types", "Thermal resistance", "SI/PI", "Yield modeling", "HBM", "Die-to-die PHY"]),
    outcomes: ["Explain 2.5D/3D/chiplet differences", "Read die-to-die metrics", "Connect architecture and packaging constraints"],
    stages: [
      {
        id: "packaging-basics",
        title: "Stage 1: package map",
        goal: "Understand wire bond, flip-chip, fan-out, interposer, and 3D stacking.",
        modules: [
          { id: "package-types", title: "Package types", purpose: "Build a package vocabulary.", tasks: ["Draw package cross-sections", "Compare fan-out and interposer", "Explain bump pitch"], keywords: ["2.5D", "3D", "interposer"], queries: ["advanced packaging 2.5D 3D interposer"] },
        ],
        checkpoints: ["Explain package trade-offs", "Read cross-section diagrams", "Identify thermal bottlenecks"],
        resources: [guide("Heterogeneous Integration Roadmap", "IEEE EPS", "https://eps.ieee.org/technology/heterogeneous-integration-roadmap.html", "Big-picture packaging roadmap.")],
      },
      {
        id: "chiplet-io",
        title: "Stage 2: chiplet I/O",
        goal: "Understand die-to-die links, HBM, interposer routing, and protocol choices.",
        modules: [
          { id: "die-to-die", title: "Die-to-die links", purpose: "Connect physical links to system architecture.", tasks: ["Compare UCIe/AIB/BoW", "Estimate bandwidth density", "Explain energy per bit"], keywords: ["UCIe", "die-to-die", "HBM"], queries: ["chiplet die-to-die UCIe HBM interposer"] },
        ],
        checkpoints: ["Read pJ/bit specs", "Explain bandwidth density", "Map memory placement"],
        resources: [guide("UCIe specification", "UCIe Consortium", "https://www.uciexpress.org/specification", "Open chiplet interconnect reference.")],
      },
      {
        id: "chiplet-system",
        title: "Stage 3: system trade-offs",
        goal: "Understand cost, yield, thermal, test, and partition decisions.",
        modules: [
          { id: "partition", title: "Chiplet partitioning", purpose: "Know why partition decisions are business and engineering decisions.", tasks: ["Draw partition options", "Estimate yield impact", "List test strategy"], keywords: ["chiplet partition", "yield", "test"], queries: ["chiplet partition yield test advanced packaging"] },
        ],
        checkpoints: ["Build partition scorecard", "Explain known-good-die", "Connect packaging to company strategy"],
        resources: [paper("Packaging papers", "advanced packaging chiplet HBM interposer die-to-die", "Search packaging and chiplet papers.")],
      },
    ],
    venues: ["ECTC", "ISSCC", "VLSI Symposium", "IEDM", "DAC", "JSSC"],
    topics: ["Devices, Process & 3D Integration", "Digital IC & Architecture", "RF/mmWave & Wireline"],
    queries: ["advanced packaging", "chiplet", "2.5D", "3D integration", "HBM", "UCIe"],
    projectIdeas: ["Make a chiplet glossary", "Compare die-to-die standards", "Map AI accelerator package choices"],
  }),
  route({
    slug: "manufacturing-equipment-materials",
    title: "Manufacturing, Equipment, and Materials",
    shortTitle: "Manufacturing",
    domain: "Devices, Process & 3D Integration",
    family: "device-manufacturing",
    level: "intermediate",
    accent: "#475569",
    subtitle: "Lithography, etch, deposition, CMP, metrology, yield, equipment, materials, and supply-chain bottlenecks.",
    description: "The route that connects process technology to equipment companies, material suppliers, and industrial reality.",
    foundation: ["Process flow", "Lithography", "Etch/deposition", "Metrology", "Yield", "Supply chain"],
    prerequisiteGroups: commonPrereq(["Semiconductor process modules", "Materials basics", "Statistics", "Yield", "Metrology", "Cleanroom concepts", "Tool matching", "Process control"]),
    outcomes: ["Read equipment/materials context", "Understand bottleneck tools", "Connect company intelligence to process steps"],
    stages: [
      {
        id: "manufacturing-process",
        title: "Stage 1: process modules",
        goal: "Understand what lithography, etch, deposition, implant, CMP, and metrology do.",
        modules: [
          { id: "process-modules", title: "Process modules", purpose: "Know what each tool family contributes.", tasks: ["Map FEOL/BEOL modules", "Explain overlay/CD", "List metrology steps"], keywords: ["lithography", "etch", "deposition"], queries: ["semiconductor equipment lithography etch deposition metrology"] },
        ],
        checkpoints: ["Draw process flow", "Explain critical dimension", "Identify tool categories"],
        resources: [guide("ASML lithography basics", "ASML", "https://www.asml.com/en/technology/lithography-principles", "Lithography overview.")],
      },
      {
        id: "manufacturing-yield",
        title: "Stage 2: yield and control",
        goal: "Understand process window, defect density, SPC, and yield learning.",
        modules: [
          { id: "yield", title: "Yield learning", purpose: "Connect process variation to economics.", tasks: ["Calculate simple yield model", "Explain defect density", "List process-control signals"], keywords: ["yield", "defect", "SPC"], queries: ["semiconductor yield process window defect density"] },
        ],
        checkpoints: ["Explain yield ramp", "Separate equipment and integration issues", "Read process-control charts"],
        resources: [guide("IRDS", "IEEE", "https://irds.ieee.org/", "Industry roadmap context.")],
      },
      {
        id: "manufacturing-supply-chain",
        title: "Stage 3: supply chain",
        goal: "Map process steps to companies and bottleneck capabilities.",
        modules: [
          { id: "company-map", title: "Company map", purpose: "Connect technology to company intelligence.", tasks: ["Map ASML/AMAT/Lam/KLA/TEL", "List materials bottlenecks", "Connect process steps to companies"], keywords: ["semiconductor equipment", "materials", "company"], queries: ["semiconductor equipment materials supply chain"] },
        ],
        checkpoints: ["Build equipment matrix", "List materials categories", "Connect learning route to company module"],
        resources: [paper("Process and equipment papers", "semiconductor process equipment materials lithography metrology", "Search process-related papers.")],
      },
    ],
    venues: ["IEDM", "VLSI Symposium", "SPIE Advanced Lithography", "IRPS"],
    topics: ["Devices, Process & 3D Integration", "Equipment", "Materials"],
    queries: ["semiconductor manufacturing", "lithography", "etch", "deposition", "metrology", "yield"],
    projectIdeas: ["Create equipment-to-process matrix", "Map material suppliers by process module", "Build a yield learning explainer"],
  }),
  route({
    slug: "eda-tools",
    title: "EDA and Design Automation",
    shortTitle: "EDA",
    domain: "EDA, CAD & Verification",
    family: "tools-quality-security",
    level: "intermediate",
    accent: "#7c3aed",
    subtitle: "Algorithms for synthesis, placement, routing, timing, verification, analog automation, ML/LLM for EDA, and design productivity.",
    description: "A route for people who want to build tools for IC design rather than only use them.",
    foundation: ["Algorithms", "Graphs", "Optimization", "C++/Python", "VLSI CAD", "EDA formats"],
    prerequisiteGroups: commonPrereq(["Data structures", "Graph algorithms", "Optimization", "C++/Python", "Digital design flow", "Verilog/netlist", "DEF/LEF", "Timing graphs"]),
    outcomes: ["Read DAC/ICCAD papers", "Build small EDA tools", "Connect algorithms to real netlists and layouts"],
    stages: [
      {
        id: "eda-algorithms",
        title: "Stage 1: algorithm base",
        goal: "Build the graph and optimization toolbox behind EDA.",
        modules: [
          { id: "eda-graphs", title: "Graphs and optimization", purpose: "Understand EDA problem formulations.", tasks: ["Implement topological sort", "Solve shortest path/min-cut toy problems", "Explain ILP/heuristics"], keywords: ["graph", "optimization", "heuristic"], queries: ["VLSI CAD graph optimization placement routing"] },
        ],
        checkpoints: ["Recognize NP-hard formulations", "Read benchmark tables", "Know common heuristics"],
        resources: [guide("Algorithms, Part I/II", "Princeton", "https://algs4.cs.princeton.edu/home/", "Algorithm foundation.")],
      },
      {
        id: "eda-flow",
        title: "Stage 2: design-flow problems",
        goal: "Understand synthesis, placement, routing, timing, and verification as tool problems.",
        modules: [
          { id: "eda-flow-module", title: "Flow modules", purpose: "Connect algorithms to chip design stages.", tasks: ["Parse a netlist", "Read DEF/LEF", "Run a tiny placement"], keywords: ["synthesis", "placement", "routing"], queries: ["EDA synthesis placement routing timing"] },
        ],
        checkpoints: ["Explain placement objective", "Read timing graph", "Understand routing congestion"],
        resources: [tool("OpenROAD", "OpenROAD", "https://theopenroadproject.org/", "Open EDA flow.")],
      },
      {
        id: "eda-ai",
        title: "Stage 3: AI for EDA",
        goal: "Evaluate where ML/LLM helps and where it produces risky claims.",
        modules: [
          { id: "ai-eda", title: "ML and LLM for EDA", purpose: "Build useful assistants without ignoring signoff reality.", tasks: ["List ML-friendly tasks", "Design eval metrics", "Add human review loop"], keywords: ["AI for EDA", "LLM", "analog automation"], queries: ["LLM EDA analog layout automation"] },
        ],
        checkpoints: ["Define tool eval", "Avoid benchmark leakage", "Connect generated output to verification"],
        resources: [paper("AI for EDA papers", "AI for EDA LLM analog layout automation", "Search current AI-EDA work.")],
      },
    ],
    venues: ["DAC", "ICCAD", "DATE", "TCAD", "ASP-DAC"],
    topics: ["EDA, CAD & Verification", "Digital IC & Architecture", "Analog & Mixed-Signal"],
    queries: ["EDA", "placement", "routing", "verification", "analog layout automation", "AI for EDA"],
    projectIdeas: ["Build a title-to-topic classifier", "Implement a tiny global placer", "Create a timing-report dashboard"],
  }),
  route({
    slug: "analog-layout-verification",
    title: "Analog Layout and Verification",
    shortTitle: "Analog Layout",
    domain: "Analog & Mixed-Signal",
    family: "tools-quality-security",
    level: "intermediate",
    accent: "#be123c",
    subtitle: "Matching, common-centroid layout, parasitics, PEX debug, reliability, EM/IR, LVS/DRC, and signoff habits.",
    description: "A practical route for turning analog schematics into manufacturable silicon, with matching layout, parasitic extraction, DRC/LVS, EM/IR, reliability, and review habits that determine whether good simulations survive real layout.",
    foundation: ["Analog circuits", "Layout rules", "Matching", "Parasitics", "DRC/LVS", "PEX"],
    prerequisiteGroups: commonPrereq(["Analog circuit basics", "Device matching", "Layout rules", "Common-centroid", "Guard rings", "PEX", "EM/IR", "Reliability"]),
    outcomes: ["Layout matching-critical analog blocks", "Debug post-layout performance shifts", "Build signoff checklists"],
    stages: [
      {
        id: "layout-matching-stage",
        title: "Stage 1: matching layout",
        goal: "Translate mismatch theory into layout decisions.",
        modules: [
          { id: "common-centroid", title: "Common-centroid layout", purpose: "Reduce gradient and systematic mismatch.", tasks: ["Draw capacitor array", "Compare interdigitated layouts", "List dummy rules"], keywords: ["common centroid", "matching", "dummy"], queries: ["common centroid analog layout matching"] },
        ],
        checkpoints: ["Explain dummies", "Choose layout unit cells", "Read matching specs"],
        resources: [paper("Layout papers", "analog layout matching common centroid parasitic extraction", "Search layout and analog papers.")],
      },
      {
        id: "layout-pex",
        title: "Stage 2: PEX debug",
        goal: "Understand why post-layout simulation changes performance.",
        modules: [
          { id: "pex", title: "PEX and parasitics", purpose: "Turn extracted RC into circuit insight.", tasks: ["Compare pre/post-PEX", "Find parasitic poles", "List coupling risks"], keywords: ["PEX", "parasitic", "coupling"], queries: ["post layout parasitic extraction analog IC"] },
        ],
        checkpoints: ["Explain parasitic-induced pole", "Debug layout mismatch", "Create extraction checklist"],
        resources: [tool("Cadence custom IC", "Cadence", "https://www.cadence.com/en_US/home/tools/custom-ic-analog-rf-design.html", "Industry layout/signoff flow.")],
      },
      {
        id: "layout-signoff",
        title: "Stage 3: signoff",
        goal: "Build habits around DRC, LVS, EM/IR, reliability, and tape-out readiness.",
        modules: [
          { id: "analog-signoff", title: "Analog signoff", purpose: "Know what must be checked before silicon.", tasks: ["List DRC/LVS/PEX/EM checks", "Plan corners", "Write debug probes"], keywords: ["DRC", "LVS", "EMIR"], queries: ["analog IC signoff DRC LVS PEX EMIR"] },
        ],
        checkpoints: ["Create signoff checklist", "Know when to waive", "Write layout review notes"],
        resources: [guide("KLayout", "KLayout", "https://www.klayout.de/", "Useful layout inspection tool.")],
      },
    ],
    venues: ["JSSC", "ISSCC", "CICC", "DAC"],
    topics: ["Analog & Mixed-Signal", "EDA, CAD & Verification"],
    queries: ["analog layout", "common centroid", "parasitic extraction", "layout matching", "analog verification"],
    projectIdeas: ["Build analog layout checklist", "Write PEX debug case study", "Create matching layout pattern library"],
  }),
  route({
    slug: "hardware-security",
    title: "Hardware Security and Trust",
    shortTitle: "Security",
    domain: "Security & Reliability",
    family: "tools-quality-security",
    level: "research",
    accent: "#be123c",
    subtitle: "Side channels, PUF, Trojan detection, secure boot, trusted execution, crypto accelerators, fault injection, and supply-chain trust.",
    description: "The route for linking security threats to circuits, architecture, verification, and manufacturing.",
    foundation: ["Digital systems", "Cryptography basics", "Embedded systems", "Statistics", "Measurement", "Verification"],
    prerequisiteGroups: commonPrereq(["AES/RSA/ECC basics", "Digital architecture", "Power/timing leakage", "Fault models", "Secure boot", "Statistics", "Oscilloscopes", "Formal basics"]),
    outcomes: ["Understand side-channel attacks", "Read PUF/Trojan/TEE papers", "Map security mechanisms to circuit and system layers"],
    stages: [
      {
        id: "security-threats",
        title: "Stage 1: threat models",
        goal: "Know what attackers can observe, control, and extract.",
        modules: [
          { id: "threat-model", title: "Threat modeling", purpose: "Separate software, hardware, and supply-chain attack surfaces.", tasks: ["Draw threat model", "Compare timing/power/fault attacks", "List trust anchors"], keywords: ["threat model", "side channel", "fault injection"], queries: ["hardware security threat model side channel fault injection"] },
        ],
        checkpoints: ["Explain attacker capability", "Define security goal", "Map leakage paths"],
        resources: [guide("CHES", "IACR", "https://ches.iacr.org/", "Cryptographic hardware venue.")],
      },
      {
        id: "side-channel",
        title: "Stage 2: side channels and countermeasures",
        goal: "Connect measurements to implementation leakage.",
        modules: [
          { id: "sca", title: "Side-channel analysis", purpose: "Understand power/EM/timing leakage and protection.", tasks: ["Draw CPA flow", "Explain masking/hiding", "Compare DPA/EMA"], keywords: ["CPA", "DPA", "masking"], queries: ["side channel attack masking hardware security"] },
        ],
        checkpoints: ["Run a toy CPA", "Explain masking costs", "Read CHES abstract"],
        resources: [tool("ChipWhisperer", "NewAE", "https://chipwhisperer.readthedocs.io/", "Hands-on side-channel platform.")],
      },
      {
        id: "trust-supply",
        title: "Stage 3: trust and supply chain",
        goal: "Understand PUF, Trojan detection, TEE, and trusted design flows.",
        modules: [
          { id: "puf-trojan", title: "PUF and Trojan", purpose: "Connect device variability and design verification to trust.", tasks: ["Explain PUF enrollment", "List Trojan triggers", "Compare detection methods"], keywords: ["PUF", "Trojan", "TEE"], queries: ["PUF hardware Trojan trusted execution IC"] },
        ],
        checkpoints: ["Create trust checklist", "Explain false positives", "Map security to product risk"],
        resources: [paper("Hardware security papers", "hardware security PUF Trojan side-channel", "Search security papers.")],
      },
    ],
    venues: ["HOST", "CHES", "DAC", "ICCAD", "USENIX Security", "ISSCC"],
    topics: ["Security & Reliability", "Digital IC & Architecture", "EDA, CAD & Verification"],
    queries: ["hardware security", "side-channel", "PUF", "Trojan", "trusted execution", "crypto accelerator"],
    projectIdeas: ["Create side-channel glossary", "Build a PUF/Trojan paper map", "Run a small CPA experiment"],
  }),
  route({
    slug: "automotive-reliability-safety",
    title: "Automotive IC, Reliability, and Functional Safety",
    shortTitle: "Automotive IC",
    domain: "General IC",
    family: "tools-quality-security",
    level: "intermediate",
    accent: "#16a34a",
    subtitle: "AEC-Q100, ISO 26262, ASIL, EMC/ESD, lifetime, fault injection, diagnostic coverage, and product qualification.",
    description: "The route for turning chip design knowledge into automotive and high-reliability product thinking.",
    foundation: ["Reliability", "Testing", "Functional safety", "Systems engineering", "Automotive standards", "Diagnostics"],
    prerequisiteGroups: commonPrereq(["Basic circuits", "Digital systems", "Reliability terms", "ESD/latch-up", "Testing", "Fault models", "Safety mechanisms", "System requirements"]),
    outcomes: ["Read qualification tables", "Understand ASIL and diagnostic coverage", "Connect chip features to safety goals"],
    stages: [
      {
        id: "auto-reliability",
        title: "Stage 1: reliability language",
        goal: "Understand AEC-Q100, HTOL, ESD, latch-up, lifetime, and FIT.",
        modules: [
          { id: "aecq100", title: "AEC-Q100 map", purpose: "Know what automotive qualification asks.", tasks: ["List AEC-Q100 groups", "Explain HTOL", "Compare consumer and automotive requirements"], keywords: ["AEC-Q100", "HTOL", "FIT"], queries: ["AEC-Q100 automotive IC reliability"] },
        ],
        checkpoints: ["Read a qualification matrix", "Explain FIT/lifetime", "List reliability risks"],
        resources: [guide("AEC-Q100 overview", "AEC", "https://www.aecouncil.com/Documents/AEC_Q100_Rev_H_Base_Document.pdf", "Automotive IC qualification reference.")],
      },
      {
        id: "functional-safety",
        title: "Stage 2: functional safety",
        goal: "Understand ISO 26262, ASIL, fault models, diagnostic coverage, redundancy, and lockstep.",
        modules: [
          { id: "asil", title: "ASIL and diagnostics", purpose: "Map system safety goals to chip mechanisms.", tasks: ["Explain ASIL", "Draw fault tree", "List ECC/BIST/lockstep use cases"], keywords: ["ISO 26262", "ASIL", "diagnostic coverage"], queries: ["ISO 26262 diagnostic coverage IC"] },
        ],
        checkpoints: ["Read safety manual fragments", "Explain diagnostic coverage", "Map mechanisms to failure modes"],
        resources: [guide("ISO 26262 introduction", "ISO", "https://www.iso.org/standard/68383.html", "Standard entry point.")],
      },
      {
        id: "auto-applications",
        title: "Stage 3: automotive applications",
        goal: "Apply reliability and safety to BMS, radar, PMIC, MCU, sensors, and domain controllers.",
        modules: [
          { id: "auto-products", title: "Product categories", purpose: "Connect standards to real chip markets.", tasks: ["Map BMS/PMIC/radar/MCU", "List safety mechanisms", "Connect company module"], keywords: ["BMS", "radar", "safety PMIC"], queries: ["automotive PMIC BMS radar IC functional safety"] },
        ],
        checkpoints: ["Build automotive IC taxonomy", "Connect companies to product categories", "Identify safety-critical blocks"],
        resources: [paper("Automotive IC papers", "automotive IC functional safety BMS radar PMIC", "Search automotive-related work.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "IRPS", "ITC", "VLSI Symposium"],
    topics: ["General IC", "Power Management", "RF/mmWave & Wireline", "Digital IC & Architecture"],
    queries: ["automotive IC", "functional safety", "BMS IC", "automotive radar", "safety PMIC"],
    projectIdeas: ["Create automotive IC category map", "Write ASIL glossary", "Map company products to automotive functions"],
  }),
  route({
    slug: "silicon-photonics",
    title: "Silicon Photonics and Optical Interconnect",
    shortTitle: "Silicon Photonics",
    domain: "RF/mmWave & Wireline",
    family: "frontier",
    level: "research",
    accent: "#0891b2",
    subtitle: "Optical modulators, photodetectors, laser coupling, TIA/driver circuits, WDM, co-packaged optics, and photonic compute.",
    description: "The route for connecting optics, analog/RF circuits, packaging, and datacenter interconnect systems.",
    foundation: ["Optics", "Electromagnetics", "Photonic devices", "TIA/driver circuits", "SerDes", "Packaging"],
    prerequisiteGroups: commonPrereq(["Waveguides", "Modulators", "Photodiodes", "TIA basics", "SerDes basics", "Package coupling", "Thermal tuning", "Link budget"]),
    outcomes: ["Read optical link budgets", "Understand optoelectronic front ends", "Evaluate CPO and silicon-photonics claims"],
    stages: [
      {
        id: "photonics-devices",
        title: "Stage 1: optical devices",
        goal: "Understand waveguides, rings, modulators, photodiodes, insertion loss, and coupling.",
        modules: [
          { id: "optical-devices", title: "Optical devices", purpose: "Translate optical terms into circuit needs.", tasks: ["Explain ring modulator", "Draw photodiode + TIA", "Calculate simple link loss"], keywords: ["silicon photonics", "modulator", "photodiode"], queries: ["silicon photonics modulator photodiode TIA"] },
        ],
        checkpoints: ["Read insertion loss specs", "Explain thermal tuning", "Draw optical receiver chain"],
        resources: [guide("Lumerical photonics learning", "Ansys", "https://www.lumerical.com/learn/intro-to-photonics/", "Simulation and photonics basics.")],
      },
      {
        id: "optoelectronic-links",
        title: "Stage 2: optoelectronic links",
        goal: "Connect photonics to TIA, driver, CDR, SerDes, and system budgets.",
        modules: [
          { id: "optical-link", title: "Optical link", purpose: "Understand energy, sensitivity, and bandwidth.", tasks: ["Build link budget", "Compare receiver sensitivity", "Read optical interconnect papers"], keywords: ["optical interconnect", "TIA", "driver"], queries: ["silicon photonics optical interconnect TIA driver"] },
        ],
        checkpoints: ["Explain optical/electrical bandwidth", "Compare pJ/bit", "List package constraints"],
        resources: [paper("Silicon photonics papers", "silicon photonics optical interconnect TIA modulator", "Search photonics and optical link papers.")],
      },
      {
        id: "photonics-system",
        title: "Stage 3: system and packaging",
        goal: "Understand co-packaged optics, WDM, laser integration, and thermal tuning.",
        modules: [
          { id: "cpo", title: "Co-packaged optics", purpose: "Place optics in datacenter system context.", tasks: ["Compare pluggable and CPO", "Explain WDM", "List laser integration options"], keywords: ["CPO", "WDM", "laser integration"], queries: ["co-packaged optics WDM silicon photonics"] },
        ],
        checkpoints: ["Build CPO trade-off table", "Explain reliability concerns", "Connect optics to chiplet packaging"],
        resources: [guide("OFC conference", "Optica/IEEE", "https://www.ofcconference.org/", "Optical communication venue.")],
      },
    ],
    venues: ["OFC", "CLEO", "ISSCC", "JLT", "Nature Photonics", "VLSI Symposium"],
    topics: ["RF/mmWave & Wireline", "Devices, Process & 3D Integration"],
    queries: ["silicon photonics", "optical interconnect", "photonic integrated circuit", "modulator", "co-packaged optics"],
    projectIdeas: ["Make optical-link budget worksheet", "Compare CPO architectures", "Build photonics term cards"],
  }),
  route({
    slug: "quantum-neuromorphic",
    title: "Quantum Control and Neuromorphic Chips",
    shortTitle: "Quantum / Neuro",
    domain: "Memory & Compute-in-Memory",
    family: "frontier",
    level: "research",
    accent: "#64748b",
    subtitle: "Cryogenic CMOS, qubit control/readout, SNN, event-driven computing, memristors, and emerging computing interfaces.",
    description: "A frontier route that should be entered after the student has at least one solid circuit or architecture base.",
    foundation: ["Quantum basics or SNN basics", "Low-noise circuits", "Digital architecture", "Device physics", "System modeling", "Benchmarking"],
    prerequisiteGroups: commonPrereq(["Quantum bits or SNN concepts", "Analog/RF basics", "Noise", "Pulse/timing systems", "Low-temperature effects", "Device variability", "Event-driven architecture", "Modeling"]),
    outcomes: ["Separate quantum control chips from quantum devices", "Read SNN/neuromorphic metrics", "Identify what remains research exploration"],
    stages: [
      {
        id: "frontier-selection",
        title: "Stage 1: choose a spine",
        goal: "Pick quantum control, cryo-CMOS, SNN architecture, or emerging devices before reading too broadly.",
        modules: [
          { id: "frontier-spine", title: "Frontier spine", purpose: "Avoid shallow everything-learning.", tasks: ["Draw qubit control or SNN dataflow", "List required physics/algorithm concepts", "Read three surveys"], keywords: ["cryo-CMOS", "SNN", "quantum chip"], queries: ["cryogenic CMOS neuromorphic SNN quantum chip"] },
        ],
        checkpoints: ["Write a reading boundary", "Identify missing prerequisites", "Create paper buckets"],
        resources: [paper("Frontier search", "cryogenic CMOS neuromorphic SNN quantum chip", "Use broad search first, then split.")],
      },
      {
        id: "frontier-interface",
        title: "Stage 2: interface circuits",
        goal: "Understand low-temperature noise, pulse generation, readout, event-driven timing, and scalability.",
        modules: [
          { id: "interface-circuits", title: "Interface circuits", purpose: "Connect physical device to control/readout electronics.", tasks: ["Explain cryo-CMOS constraints", "Compare rate and temporal coding", "List readout chain metrics"], keywords: ["cryo-CMOS", "readout", "event-driven"], queries: ["cryo CMOS readout neuromorphic event driven IC"] },
        ],
        checkpoints: ["Explain thermal budget", "Read readout specs", "Compare coding schemes"],
        resources: [guide("Nature Electronics", "Nature Portfolio", "https://www.nature.com/natelectron/", "Frontier electronics venue.")],
      },
      {
        id: "frontier-project",
        title: "Stage 3: verifiable project",
        goal: "Turn frontier reading into a small simulation, benchmark, or taxonomy rather than hype.",
        modules: [
          { id: "frontier-project-module", title: "Project discipline", purpose: "Make frontier learning testable.", tasks: ["Simulate a small SNN", "Draw a quantum-control chain", "Compare device claims"], keywords: ["benchmark", "simulation", "taxonomy"], queries: ["neuromorphic benchmark cryogenic CMOS quantum control"] },
        ],
        checkpoints: ["Define success metric", "Avoid vague claims", "Document assumptions"],
        resources: [tool("Brian2 SNN simulator", "Brian project", "https://brian2.readthedocs.io/", "SNN simulation entry.")],
      },
    ],
    venues: ["ISSCC", "JSSC", "IEDM", "Nature Electronics", "ISCA", "AICAS"],
    topics: ["Memory & Compute-in-Memory", "Devices, Process & 3D Integration", "Digital IC & Architecture"],
    queries: ["quantum chip", "cryogenic CMOS", "neuromorphic", "SNN", "spiking neural network"],
    projectIdeas: ["Build cryo-CMOS reading list", "Simulate a small SNN", "Create a frontier claim checklist"],
  }),
];

export const routeFamilies: RouteFamilySeed[] = [
  {
    id: "ic-design",
    title: "IC Design Routes",
    description: "Core chip-design routes: analog, mixed-signal integration, ADC/DAC, PLL/clocking, RF/mmWave, SerDes, PMIC, sensing, and memory/CIM.",
    routeIds: ["analog-mixed-signal", "mixed-signal-system-integration", "data-converters", "clocking-pll-timing", "wireline-serdes", "rf-mmwave", "power-management", "sensor-bio-interface", "memory-cim"],
  },
  {
    id: "digital-system",
    title: "Digital and System Routes",
    description: "RTL, ASIC, backend, verification, architecture, acceleration, and FPGA routes.",
    routeIds: ["digital-asic", "digital-backend-physical-design", "verification-dft", "architecture-accelerator", "fpga-reconfigurable"],
  },
  {
    id: "device-manufacturing",
    title: "Device and Manufacturing Routes",
    description: "Device physics, process integration, power devices, packaging, equipment, materials, and manufacturing strategy.",
    routeIds: ["devices-process", "power-devices", "advanced-packaging", "manufacturing-equipment-materials"],
  },
  {
    id: "tools-quality-security",
    title: "Tools, Quality, and Security Routes",
    description: "EDA, analog layout, hardware security, verification culture, reliability, and automotive productization.",
    routeIds: ["eda-tools", "analog-layout-verification", "hardware-security", "automotive-reliability-safety"],
  },
  {
    id: "frontier",
    title: "Frontier and Cross-Disciplinary Routes",
    description: "Research-heavy routes that are best approached after a solid circuit, architecture, or device base.",
    routeIds: ["silicon-photonics", "quantum-neuromorphic"],
  },
];

export const commonFoundations: FoundationGroupSeed[] = [
  {
    title: "Math and Signals",
    note: "The shared language behind circuits, systems, devices, and EDA.",
    items: ["Calculus and differential equations", "Linear algebra", "Probability and statistics", "Complex frequency-domain analysis", "Signals and systems", "Optimization basics"],
  },
  {
    title: "Devices and Physics",
    note: "Enough physics to understand PDKs, parasitics, variability, and reliability.",
    items: ["Electromagnetics", "Solid-state physics", "Semiconductor devices", "Noise mechanisms", "Process variation", "Reliability basics"],
  },
  {
    title: "Circuits and Systems",
    note: "The minimum circuit base before specializing.",
    items: ["Circuit analysis", "Analog electronics", "Digital logic", "Feedback and stability", "Sampling and quantization", "Computer organization"],
  },
  {
    title: "Engineering Tools",
    note: "The practical layer that turns knowledge into reproducible work.",
    items: ["Linux and Git", "Python or MATLAB", "SPICE simulation", "Verilog/SystemVerilog", "Cadence/Synopsys/Siemens EDA", "Paper reading and benchmark tables"],
  },
];

export const learningSource = {
  name: "SiliconScope curated IC roadmap",
  url: "https://github.com/Crys-Chen/ic-guide",
  note: "Structure is inspired by public IC learning guides and then rewritten as a SiliconScope product catalog. University-specific and advisor-specific content is intentionally excluded.",
};

const lessonTemplate = {
  problem: "Define the real circuit or system problem and where it appears in IC papers.",
  intuition: "Explain the core intuition in plain engineering language.",
  minimalBlock: "Add a minimal circuit/system block diagram or pseudocode sketch.",
  equations: "List the essential equations and state their assumptions.",
  specs: "Define the important metrics, units, and measurement conditions.",
  tradeoffs: "Explain the main design trade-offs and why papers choose different points.",
  pitfalls: "List common silicon, measurement, classification, or benchmark traps.",
  paperDirections: "Connect the concept to representative paper directions and venues.",
  searches: "Provide SiliconScope search queries and topic filters.",
  quiz: "Add quick self-check questions.",
  next: "Suggest the next lesson and one small project.",
};

const rawLessons: Array<[string, string, string, string, LessonLevel, number, string[], string[], string[]]> = [
  ["mos-small-signal", "MOS small-signal model", "analog-mixed-signal", "mos-small-signal", "starter", 18, ["Analog & Mixed-Signal"], ["MOS small signal analog IC"], ["JSSC", "TCAS-I"]],
  ["feedback-loop-gain", "Loop gain and phase margin", "analog-mixed-signal", "diff-feedback", "core", 22, ["Analog & Mixed-Signal"], ["opamp loop stability compensation"], ["JSSC", "ISSCC"]],
  ["noise-input-referred", "Input-referred noise", "analog-mixed-signal", "noise-linearity", "core", 20, ["Analog & Mixed-Signal"], ["analog IC input referred noise"], ["JSSC", "CICC"]],
  ["mixed-signal-boundary-map", "Mixed-signal boundary map", "mixed-signal-system-integration", "sample-clock-reset", "core", 24, ["Analog & Mixed-Signal", "EDA, CAD & Verification"], ["mixed-signal IC calibration register map AMS verification"], ["ISSCC", "JSSC", "CICC"]],
  ["adc-fom-reading", "Reading ADC FoM correctly", "data-converters", "adc-metrics", "paper-reading", 20, ["Analog & Mixed-Signal", "ADC"], ["ADC FoM ENOB SNDR Walden Schreier"], ["ISSCC", "JSSC"]],
  ["sar-adc-binary-search", "SAR ADC binary search", "data-converters", "sar-adc", "starter", 18, ["Analog & Mixed-Signal", "ADC"], ["SAR ADC capacitor DAC comparator calibration"], ["ISSCC", "JSSC"]],
  ["delta-sigma-noise-shaping", "Delta-sigma noise shaping", "data-converters", "pipeline-dsm", "advanced", 24, ["Analog & Mixed-Signal", "ADC"], ["delta sigma ADC noise shaping"], ["ISSCC", "JSSC"]],
  ["pll-phase-noise-to-jitter", "Phase noise to integrated jitter", "clocking-pll-timing", "pll-noise-language", "core", 22, ["Clocking & Frequency Generation"], ["PLL phase noise integrated jitter"], ["ISSCC", "JSSC"]],
  ["adpll-dtc-resolution", "ADPLL DTC resolution and spur", "clocking-pll-timing", "adpll", "advanced", 24, ["Clocking & Frequency Generation"], ["ADPLL DTC spur resolution"], ["ISSCC", "JSSC"]],
  ["serdes-eye-and-equalization", "SerDes eye diagram and equalization", "wireline-serdes", "eye-diagram", "starter", 20, ["RF/mmWave & Wireline"], ["SerDes eye diagram CTLE DFE"], ["ISSCC", "JSSC"]],
  ["pam4-cdr-intuition", "PAM4 receiver CDR intuition", "wireline-serdes", "cdr", "advanced", 24, ["RF/mmWave & Wireline"], ["PAM4 receiver CDR wireline"], ["ISSCC", "JSSC"]],
  ["rf-noise-figure", "RF noise figure", "rf-mmwave", "rf-metrics-module", "starter", 18, ["RF/mmWave & Wireline"], ["RF noise figure LNA"], ["RFIC", "JSSC"]],
  ["mmwave-phased-array", "mmWave phased array", "rf-mmwave", "phased-array", "advanced", 25, ["RF/mmWave & Wireline"], ["mmWave phased array beamforming IC"], ["ISSCC", "JSSC", "RFIC"]],
  ["ldo-loop-stability", "LDO loop stability", "power-management", "ldo", "core", 22, ["Power Management"], ["LDO loop stability load transient PSRR"], ["ISSCC", "JSSC", "CICC"]],
  ["hybrid-dcdc-classification", "Hybrid DC-DC converter classification", "power-management", "sc-hybrid", "paper-reading", 20, ["Power Management"], ["dual-path hybrid switched-capacitor converter"], ["ISSCC", "JSSC", "CICC"]],
  ["sensor-afe-noise", "Sensor AFE noise", "sensor-bio-interface", "afe-noise", "core", 20, ["Biomedical, Sensor & Imaging IC"], ["sensor AFE input referred noise biomedical IC"], ["ISSCC", "TBioCAS"]],
  ["image-sensor-column-adc", "CMOS image sensor column ADC", "sensor-bio-interface", "sensor-physics", "advanced", 22, ["Biomedical, Sensor & Imaging IC", "ADC"], ["CMOS image sensor column ADC"], ["ISSCC", "JSSC"]],
  ["rtl-fsm-discipline", "RTL and FSM discipline", "digital-asic", "rtl-fsm", "starter", 18, ["Digital IC & Architecture"], ["digital ASIC RTL FSM FIFO"], ["DAC", "ICCAD"]],
  ["soc-cdc-basics", "SoC clock-domain crossing", "digital-asic", "soc-integration", "core", 22, ["Digital IC & Architecture", "EDA, CAD & Verification"], ["SoC clock domain crossing ASIC"], ["DAC", "ICCAD"]],
  ["sta-setup-hold", "Setup/hold timing report reading", "digital-backend-physical-design", "sta", "starter", 20, ["EDA, CAD & Verification"], ["STA setup hold timing report ASIC"], ["DAC", "ICCAD"]],
  ["cts-skew-latency", "Clock-tree skew and latency", "digital-backend-physical-design", "pnr", "core", 22, ["EDA, CAD & Verification"], ["clock tree synthesis skew latency"], ["DAC", "ICCAD", "ISPD"]],
  ["sva-coverage", "Assertions and coverage", "verification-dft", "sv-assertions", "starter", 20, ["EDA, CAD & Verification"], ["SystemVerilog assertions functional coverage"], ["DAC", "DATE"]],
  ["scan-atpg-bist", "Scan, ATPG, and BIST", "verification-dft", "dft", "core", 22, ["EDA, CAD & Verification"], ["DFT scan ATPG BIST IC"], ["ITC", "DAC"]],
  ["systolic-array", "Systolic array dataflow", "architecture-accelerator", "systolic-array", "core", 20, ["Digital IC & Architecture"], ["AI accelerator systolic array"], ["ISSCC", "ISCA", "MICRO"]],
  ["tops-per-watt-traps", "TOPS/W benchmark traps", "architecture-accelerator", "digital-metrics", "paper-reading", 20, ["Digital IC & Architecture"], ["AI accelerator TOPS/W benchmark"], ["ISSCC", "ISCA"]],
  ["fpga-utilization", "FPGA utilization and timing", "fpga-reconfigurable", "fpga-fabric", "starter", 18, ["Digital IC & Architecture"], ["FPGA LUT BRAM timing closure"], ["FPGA", "FPL"]],
  ["fpga-streaming", "FPGA streaming accelerator", "fpga-reconfigurable", "fpga-streaming", "core", 22, ["Digital IC & Architecture"], ["FPGA streaming accelerator fixed point"], ["FCCM", "FPGA"]],
  ["sram-read-stability", "6T SRAM read stability", "memory-cim", "sram", "core", 20, ["Memory & Compute-in-Memory"], ["6T SRAM read stability"], ["ISSCC", "JSSC", "VLSI Symposium"]],
  ["analog-cim-adc-overhead", "Analog CIM and ADC overhead", "memory-cim", "analog-cim", "research-frontier", 25, ["Memory & Compute-in-Memory"], ["analog compute in memory ADC overhead"], ["ISSCC", "JSSC"]],
  ["mosfet-scaling", "MOSFET scaling and short-channel effects", "devices-process", "mos-device", "core", 22, ["Devices, Process & 3D Integration"], ["MOSFET scaling short channel effects"], ["IEDM", "VLSI Symposium"]],
  ["process-window-yield", "Process window and yield learning", "manufacturing-equipment-materials", "yield", "core", 22, ["Devices, Process & 3D Integration"], ["semiconductor process window yield learning"], ["IEDM", "VLSI Symposium"]],
  ["gan-sic-power-devices", "SiC and GaN power devices", "power-devices", "sic-gan", "advanced", 24, ["Devices, Process & 3D Integration", "Power Management"], ["SiC GaN power semiconductor wide bandgap"], ["ISPSD", "IEDM"]],
  ["chiplet-die-to-die", "Chiplet die-to-die links", "advanced-packaging", "die-to-die", "advanced", 22, ["Devices, Process & 3D Integration"], ["chiplet die-to-die UCIe HBM"], ["ECTC", "ISSCC"]],
  ["eda-placement-routing", "Placement and routing as optimization", "eda-tools", "eda-flow-module", "core", 22, ["EDA, CAD & Verification"], ["EDA placement routing timing"], ["DAC", "ICCAD"]],
  ["common-centroid-layout", "Common-centroid layout intuition", "analog-layout-verification", "common-centroid", "core", 18, ["Analog & Mixed-Signal", "EDA, CAD & Verification"], ["common centroid analog layout matching"], ["JSSC", "DAC"]],
  ["side-channel-cpa", "Side-channel CPA intuition", "hardware-security", "sca", "advanced", 24, ["Security & Reliability"], ["side channel attack masking hardware security"], ["CHES", "HOST"]],
  ["aecq100-qualification", "AEC-Q100 qualification map", "automotive-reliability-safety", "aecq100", "starter", 18, ["General IC"], ["AEC-Q100 automotive IC reliability"], ["IRPS", "ITC"]],
  ["optical-link-budget", "Silicon photonics link budget", "silicon-photonics", "optical-link", "research-frontier", 24, ["RF/mmWave & Wireline"], ["silicon photonics optical interconnect TIA driver"], ["OFC", "ISSCC"]],
  ["cryo-cmos-frontier", "Cryogenic CMOS frontier map", "quantum-neuromorphic", "interface-circuits", "research-frontier", 24, ["Memory & Compute-in-Memory"], ["cryo CMOS readout neuromorphic event driven IC"], ["ISSCC", "IEDM"]],
];

export const dailyLessons: DailyLessonSeed[] = rawLessons.map(([id, title, roadmapSlug, moduleId, level, estimatedMinutes, relatedTopics, relatedSearchQueries, relatedVenues]) => ({
  id,
  title,
  roadmapSlug,
  moduleId,
  level,
  estimatedMinutes,
  sectionPlaceholders: lessonTemplate,
  relatedTopics,
  relatedSearchQueries,
  relatedVenues,
}));
