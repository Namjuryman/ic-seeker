export type RoadmapLevel = "foundation" | "intermediate" | "advanced" | "research";
export type LessonLevel = "starter" | "core" | "advanced" | "paper-reading" | "research-frontier";

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

const lessonTemplate = {
  problem: "Placeholder: define the circuit problem and where it appears in IC papers.",
  intuition: "Placeholder: write the core intuition manually later.",
  minimalBlock: "Placeholder: add a minimal circuit block or diagram later.",
  equations: "Placeholder: verify equations manually before publishing.",
  specs: "Placeholder: list important specs and measurement definitions.",
  tradeoffs: "Placeholder: summarize design trade-offs with examples.",
  pitfalls: "Placeholder: add common pitfalls from real design experience.",
  paperDirections: "Placeholder: connect to representative paper directions.",
  searches: "Placeholder: generated SiliconScope searches are shown separately.",
  quiz: "Placeholder: add a quick quiz after the lesson text is written.",
  next: "Placeholder: suggest the next lesson after this unit is reviewed.",
};

function moduleSeed(id: string, title: string, purpose: string, lessons: string[], queries: string[]): RoadmapModule {
  return { id, title, purpose, lessonPlaceholders: lessons, relatedKeywords: lessons, relatedPaperQueries: queries };
}

export const learningRoadmaps: LearningRoadmapSeed[] = [
  {
    slug: "analog-foundations",
    title: "Analog IC Foundations",
    shortTitle: "Analog Foundations",
    domain: "Analog & Mixed-Signal",
    level: "foundation",
    description: "The base route for analog, mixed-signal, PMIC, ADC, PLL, and RF paper reading.",
    targetUsers: ["New analog IC learners", "Students preparing for IC groups", "Readers who need circuit intuition before papers"],
    prerequisites: ["Circuit analysis", "Semiconductor devices", "Signals and systems", "Basic SPICE simulation"],
    relatedTopics: ["Analog & Mixed-Signal", "General IC"],
    relatedVenues: ["JSSC", "ISSCC", "CICC", "VLSI Symposium", "TCAS-I", "TCAS-II"],
    relatedSearchQueries: ["analog amplifier", "current mirror", "differential pair", "analog layout matching"],
    caveat: "Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.",
    stages: [
      {
        id: "analog-0",
        title: "Device and small-signal thinking",
        goal: "Build the transistor-level mental model needed to read circuit papers.",
        modules: [
          moduleSeed("mos-small-signal", "MOS small-signal model", "Understand gm, ro, body effect, and intrinsic gain.", ["MOS operation regions", "gm, ro, intrinsic gain", "Body effect"], ["MOS small signal analog IC"]),
          moduleSeed("bias-mirrors", "Current mirrors and biasing", "Connect bias accuracy, headroom, and mismatch.", ["Current mirror accuracy", "Cascode and gain boosting", "Bias startup"], ["current mirror bias circuit analog"]),
        ],
      },
      {
        id: "analog-1",
        title: "Amplifiers, feedback, and nonidealities",
        goal: "Move from textbook blocks to paper-level analog subcircuits.",
        modules: [
          moduleSeed("single-stage", "Single-stage amplifiers", "Read common-source, source follower, and common-gate blocks.", ["Common-source amplifier gain", "Source follower", "Common-gate amplifier"], ["low power amplifier common source"]),
          moduleSeed("diff-feedback", "Differential pairs and feedback", "Understand active loads, CMFB, loop gain, and compensation.", ["Differential pair intuition", "CMFB", "Miller compensation"], ["differential amplifier CMFB compensation"]),
          moduleSeed("noise-layout", "Noise, mismatch, and layout awareness", "Translate schematic choices into noise and layout constraints.", ["Thermal noise vs flicker noise", "Mismatch and offset", "Analog layout matching"], ["analog layout matching mismatch offset"]),
        ],
      },
    ],
  },
  {
    slug: "pmic",
    title: "Power Management / PMIC",
    shortTitle: "PMIC",
    domain: "Power Management",
    level: "intermediate",
    description: "A focused route for LDO, DC-DC, switched-capacitor, hybrid converters, IVR, and energy harvesting.",
    targetUsers: ["Students entering PMIC groups", "Readers of LDO/DC-DC papers", "Users interested in integrated power delivery"],
    prerequisites: ["Analog feedback", "Control basics", "Power electronics basics", "Device parasitics"],
    relatedTopics: ["Power Management", "Analog & Mixed-Signal"],
    relatedVenues: ["ISSCC", "JSSC", "CICC", "VLSI Symposium", "ASSCC", "ESSCIRC", "TCAS-I"],
    relatedSearchQueries: ["LDO loop stability", "digital LDO", "switched-capacitor converter", "hybrid converter", "integrated voltage regulator", "energy harvesting PMIC"],
    caveat: "PMIC lessons are linked to metadata-based searches. Verify converter equations, specs, and efficiency definitions manually.",
    stages: [
      {
        id: "pmic-0",
        title: "Regulators and references",
        goal: "Understand references, linear regulation, PSR, and loop stability.",
        modules: [
          moduleSeed("bandgap", "Bandgap reference", "Frame temperature-stable references and startup issues.", ["Bandgap reference", "Temperature coefficient", "Startup circuit"], ["bandgap reference CMOS"]),
          moduleSeed("ldo", "LDO architecture and loop stability", "Connect pass devices, error amps, load transients, and compensation.", ["LDO loop stability", "PSRR in LDO", "Load transient"], ["LDO loop stability PSRR"]),
        ],
      },
      {
        id: "pmic-1",
        title: "Switching and hybrid converters",
        goal: "Read buck/boost/SC/hybrid converter papers with the right metrics.",
        modules: [
          moduleSeed("inductive", "Inductive buck and boost converters", "Understand ripple, control modes, losses, and sensing.", ["Buck converter current ripple", "Current-mode control", "Dead-time control"], ["buck boost converter current mode IC"]),
          moduleSeed("sc-hybrid", "SC and hybrid converters", "Reason about charge sharing, conversion ratio, and hybrid efficiency.", ["Switched-capacitor charge sharing", "Flying capacitor", "Hybrid converter"], ["switched capacitor hybrid converter PMIC"]),
          moduleSeed("ivr", "On-chip and 3D power delivery", "Connect IVR, chiplets, distributed power, and thermal limits.", ["Integrated voltage regulator", "3D power delivery", "Chiplet power"], ["integrated voltage regulator 3D power delivery"]),
        ],
      },
    ],
  },
  {
    slug: "data-converters",
    title: "Data Converters / ADC-DAC",
    shortTitle: "ADC / DAC",
    domain: "Analog & Mixed-Signal",
    level: "intermediate",
    description: "A route for SAR, pipeline, delta-sigma, time-interleaved ADCs, DACs, and calibration.",
    targetUsers: ["Mixed-signal learners", "ADC/DAC paper readers", "Sensor/RF interface designers"],
    prerequisites: ["Sampling theory", "Noise basics", "Comparator basics", "Capacitor matching"],
    relatedTopics: ["Analog & Mixed-Signal", "Data Converters"],
    relatedVenues: ["ISSCC", "JSSC", "VLSI Symposium", "CICC", "ASSCC", "ESSCIRC"],
    relatedSearchQueries: ["SAR ADC", "pipeline ADC", "delta-sigma ADC", "time-interleaved ADC", "ADC calibration", "current steering DAC"],
    caveat: "Converter metrics such as SNDR, ENOB, SFDR, INL, and DNL must be verified from source papers.",
    stages: [
      {
        id: "adc-0",
        title: "Metrics and core blocks",
        goal: "Read ADC/DAC specifications without losing the circuit context.",
        modules: [
          moduleSeed("metrics", "Sampling, quantization, and metrics", "Understand quantization noise, SNDR, ENOB, SFDR, INL, and DNL.", ["Quantization noise", "SNR / SNDR / ENOB", "INL / DNL"], ["ADC SNDR ENOB INL DNL"]),
          moduleSeed("comp-cdac", "Comparator and capacitive DAC", "Understand offset, kickback, capacitor mismatch, and switching.", ["Comparator kickback", "Capacitive DAC mismatch", "SAR binary search"], ["SAR ADC comparator kickback capacitor DAC"]),
        ],
      },
      {
        id: "adc-1",
        title: "Architectures and calibration",
        goal: "Map architecture choices to speed, resolution, power, and digital assistance.",
        modules: [
          moduleSeed("sar-pipeline", "SAR and pipeline ADC", "Compare binary-search and residue-amplifier based conversion.", ["SAR ADC binary search", "Pipeline ADC residue", "MDAC"], ["SAR ADC pipeline ADC calibration"]),
          moduleSeed("ds-ti", "Delta-sigma and time-interleaved ADC", "Understand noise shaping, loop filters, channel mismatch, and calibration.", ["Delta-sigma noise shaping", "Time-interleaved ADC mismatch", "Background calibration"], ["delta sigma ADC time interleaved calibration"]),
        ],
      },
    ],
  },
  {
    slug: "pll-clocking",
    title: "PLL / Clocking / Frequency Synthesis",
    shortTitle: "PLL / Clocking",
    domain: "Clocking & Frequency Generation",
    level: "intermediate",
    description: "A route for PLL systems, VCO/DCO, jitter, phase noise, spurs, ADPLL, and clock distribution.",
    targetUsers: ["PLL paper readers", "ADC/RF/SerDes learners needing clocking", "Clock generation designers"],
    prerequisites: ["Signals and systems", "Noise concepts", "Control loop intuition", "Basic analog blocks"],
    relatedTopics: ["Clocking & Frequency Generation", "RF/mmWave & Wireline"],
    relatedVenues: ["ISSCC", "JSSC", "CICC", "VLSI Symposium", "RFIC", "ASSCC"],
    relatedSearchQueries: ["charge pump PLL", "fractional-N PLL", "ADPLL", "LC oscillator", "jitter clocking", "injection locked PLL"],
    caveat: "Phase noise and jitter conversions are easy to misuse; verify definitions before design decisions.",
    stages: [
      {
        id: "pll-0",
        title: "Loop anatomy",
        goal: "Understand PLL block roles and loop behavior.",
        modules: [
          moduleSeed("pfd-cp", "PFD and charge pump", "Understand phase detection, charge pump mismatch, and reference spurs.", ["PFD and charge pump", "Charge pump mismatch", "Reference spur"], ["charge pump PLL reference spur"]),
          moduleSeed("loop", "Loop bandwidth and stability", "Relate loop filter, bandwidth, lock behavior, and noise transfer.", ["PLL loop bandwidth", "Loop filter", "Type-II PLL"], ["PLL loop bandwidth jitter"]),
        ],
      },
      {
        id: "pll-1",
        title: "Oscillators and digital assistance",
        goal: "Connect oscillator design, fractional synthesis, and calibration.",
        modules: [
          moduleSeed("vco", "VCO / DCO and phase noise", "Understand oscillator gain, supply pushing, and phase-noise intuition.", ["VCO gain", "Phase noise intuition", "Supply pushing"], ["LC oscillator phase noise DCO"]),
          moduleSeed("fractional", "Fractional-N, ADPLL, and injection locking", "Read modern digital clocking and spur calibration papers.", ["Fractional-N spur", "ADPLL basics", "Injection locking"], ["fractional N PLL ADPLL injection locked"]),
        ],
      },
    ],
  },
  {
    slug: "rf-mmwave",
    title: "RF / mmWave / Wireless IC",
    shortTitle: "RF / mmWave",
    domain: "RF/mmWave & Wireline",
    level: "advanced",
    description: "A route for RF metrics, LNA, mixer, PA, receiver/transmitter chains, mmWave front-ends, and phased arrays.",
    targetUsers: ["RFIC learners", "mmWave paper readers", "Wireless transceiver designers"],
    prerequisites: ["Analog IC basics", "Electromagnetics", "Communication systems", "S-parameters"],
    relatedTopics: ["RF/mmWave & Wireline"],
    relatedVenues: ["ISSCC", "JSSC", "RFIC", "VLSI Symposium", "CICC", "T-MTT"],
    relatedSearchQueries: ["mmWave transceiver", "phased array IC", "low noise amplifier", "RF mixer", "power amplifier CMOS", "beamforming IC"],
    caveat: "RF metrics are strongly measurement-context dependent. Treat metadata links as discovery aids.",
    stages: [
      {
        id: "rf-0",
        title: "RF metrics and receiver blocks",
        goal: "Build the vocabulary for RF receiver papers.",
        modules: [
          moduleSeed("rf-metrics", "Noise, linearity, and matching", "Understand NF, IIP3, gain compression, and impedance matching.", ["Noise figure", "IIP3 / OIP3", "Impedance matching"], ["RF noise figure IIP3 matching"]),
          moduleSeed("rx-blocks", "LNA and mixer", "Read receiver front-end blocks and conversion metrics.", ["LNA gain and linearity", "Mixer conversion gain", "LO leakage"], ["low noise amplifier mixer RFIC"]),
        ],
      },
      {
        id: "rf-1",
        title: "Transmitters and mmWave systems",
        goal: "Connect PA, frequency planning, phased arrays, and calibration.",
        modules: [
          moduleSeed("pa", "Power amplifier and TX chain", "Understand efficiency, linearity, and transmitter architecture.", ["PA efficiency", "PA linearity", "Envelope tracking"], ["CMOS power amplifier efficiency"]),
          moduleSeed("array", "mmWave phased array", "Understand beamforming, phase shifters, T/R switches, and antenna interfaces.", ["mmWave phased array", "Beamforming phase shifter", "T/R switch"], ["mmWave phased array beamforming IC"]),
        ],
      },
    ],
  },
  {
    slug: "wireline-serdes",
    title: "Wireline / SerDes / High-Speed I/O",
    shortTitle: "SerDes",
    domain: "RF/mmWave & Wireline",
    level: "advanced",
    description: "A route for wireline channels, equalization, CDR, PAM4, jitter, and high-speed I/O links.",
    targetUsers: ["SerDes learners", "High-speed I/O paper readers", "Chiplet/interconnect researchers"],
    prerequisites: ["Signals and systems", "Communication basics", "Clocking basics", "Analog front-end basics"],
    relatedTopics: ["RF/mmWave & Wireline", "Digital IC & Architecture"],
    relatedVenues: ["ISSCC", "JSSC", "VLSI Symposium", "CICC", "ASSCC"],
    relatedSearchQueries: ["wireline receiver", "SerDes", "PAM4 receiver", "clock data recovery", "equalizer", "ADC based receiver"],
    caveat: "Wireline metrics depend on channels, packages, and test setup. Verify BER and eye-diagram assumptions.",
    stages: [
      {
        id: "serdes-0",
        title: "Channel, equalization, and timing",
        goal: "Understand how channel loss creates circuit requirements.",
        modules: [
          moduleSeed("channel", "Channel loss and eye diagram", "Frame ISI, jitter, and eye closure.", ["Eye diagram", "Channel loss and ISI", "Jitter decomposition"], ["wireline channel loss eye diagram"]),
          moduleSeed("eq", "FFE / CTLE / DFE", "Read equalizer architecture and adaptation loops.", ["FFE / CTLE / DFE", "Adaptation loop", "ADC-based receiver"], ["SerDes equalizer CTLE DFE"]),
          moduleSeed("cdr", "Clock and data recovery", "Understand phase detectors, timing recovery, and jitter tolerance.", ["Clock and data recovery", "Bang-bang phase detector", "PAM4 signaling"], ["clock data recovery PAM4 receiver"]),
        ],
      },
    ],
  },
  {
    slug: "memory-cim",
    title: "Memory / SRAM / MRAM / RRAM / Compute-in-Memory",
    shortTitle: "Memory / CIM",
    domain: "Memory & Compute-in-Memory",
    level: "advanced",
    description: "A route for SRAM macros, emerging memory, periphery, and compute-in-memory circuits.",
    targetUsers: ["Memory circuit learners", "CIM paper readers", "AI accelerator researchers"],
    prerequisites: ["Digital logic", "Device basics", "Analog sensing", "Memory hierarchy"],
    relatedTopics: ["Memory & Compute-in-Memory", "Digital IC & Architecture"],
    relatedVenues: ["ISSCC", "JSSC", "VLSI Symposium", "IEDM", "CICC", "TVLSI"],
    relatedSearchQueries: ["SRAM sense amplifier", "low voltage SRAM", "MRAM macro", "RRAM compute in memory", "analog compute in memory", "digital compute in memory"],
    caveat: "CIM numbers depend on workload, precision, ADC/DAC assumptions, and measurement boundaries.",
    stages: [
      {
        id: "memory-0",
        title: "SRAM, emerging memory, and CIM",
        goal: "Connect bitcell behavior, peripheral circuits, and compute mapping.",
        modules: [
          moduleSeed("sram", "6T SRAM and stability", "Frame read stability, write margin, SNM, and assist.", ["6T SRAM read stability", "Write margin", "SRAM assist techniques"], ["6T SRAM read stability assist"]),
          moduleSeed("periphery", "Sense amplifier and bitline circuits", "Understand precharge, sensing, muxing, and variation.", ["Sense amplifier", "Bitline precharge", "Column mux"], ["SRAM sense amplifier bitline"]),
          moduleSeed("cim", "Compute-in-Memory macro", "Understand analog/digital MAC, precision, and data movement.", ["MRAM basics", "RRAM crossbar", "Analog compute-in-memory", "Digital CIM macro"], ["compute in memory macro ADC DAC"]),
        ],
      },
    ],
  },
  {
    slug: "eda-cad-ai",
    title: "EDA / CAD / AI for IC Design",
    shortTitle: "EDA / AI4IC",
    domain: "EDA, CAD & Verification",
    level: "research",
    description: "A route for design automation, analog sizing, layout automation, ML optimization, and agentic EDA.",
    targetUsers: ["EDA/CAD learners", "Circuit designers interested in automation", "AI4EDA researchers"],
    prerequisites: ["IC design flow", "Python", "Optimization", "Basic ML", "EDA tool scripting"],
    relatedTopics: ["EDA, CAD & Verification", "Digital IC & Architecture"],
    relatedVenues: ["DAC", "ICCAD", "DATE", "TCAD", "ASP-DAC", "ISPD"],
    relatedSearchQueries: ["AI for EDA", "analog circuit sizing", "analog layout automation", "Bayesian optimization circuit design", "LLM EDA", "physical design automation"],
    caveat: "EDA route content is a tooling map, not a promise that automation replaces circuit expertise.",
    stages: [
      {
        id: "eda-0",
        title: "Automation, layout, and AI agents",
        goal: "Represent circuits, tests, constraints, and layouts in tool-friendly forms.",
        modules: [
          moduleSeed("testbench", "SPICE testbench automation", "Automate simulation, corners, and measurement extraction.", ["SPICE testbench automation", "Corner simulation", "Monte Carlo"], ["SPICE testbench automation circuit"]),
          moduleSeed("sizing", "Design space exploration", "Understand sizing loops, surrogate models, and optimization.", ["Design space exploration", "Bayesian optimization", "ML surrogate model"], ["Bayesian optimization analog circuit sizing"]),
          moduleSeed("llm", "LLM / agentic EDA workflow", "Explore code/script generation and verification guardrails.", ["Layout constraint generation", "DRC / LVS flow", "LLM for EDA scripting"], ["LLM EDA analog layout automation"]),
        ],
      },
    ],
  },
  {
    slug: "digital-soc-accelerator",
    title: "Digital / SoC / AI Accelerator Circuits",
    shortTitle: "Digital / Accelerator",
    domain: "Digital IC & Architecture",
    level: "intermediate",
    description: "A supporting route for digital circuits, SoC design, AI accelerators, dataflow, chiplets, and system-level IC intelligence.",
    targetUsers: ["CIM and accelerator learners", "Digital circuit readers", "Users moving from circuits to architecture"],
    prerequisites: ["Digital logic", "Computer architecture", "Verilog/SystemVerilog", "Low-power design basics"],
    relatedTopics: ["Digital IC & Architecture", "Memory & Compute-in-Memory"],
    relatedVenues: ["ISSCC", "JSSC", "VLSI Symposium", "DAC", "ICCAD", "DATE", "MICRO", "ISCA", "HPCA"],
    relatedSearchQueries: ["AI accelerator", "low power digital circuit", "chiplet architecture", "systolic array", "near memory computing", "SoC power management"],
    caveat: "Digital/accelerator route connects circuit papers to system-level research, not a replacement for architecture courses.",
    stages: [
      {
        id: "digital-0",
        title: "Digital timing, power, and accelerators",
        goal: "Understand low-power digital blocks and accelerator dataflow.",
        modules: [
          moduleSeed("timing", "CMOS delay and sequential timing", "Frame delay, setup/hold, clocking, and timing closure.", ["CMOS inverter delay", "Flip-flop timing", "Clock tree"], ["low power digital circuit timing"]),
          moduleSeed("accelerator", "AI accelerator dataflow", "Understand MAC arrays, systolic arrays, quantization, and sparsity.", ["Systolic array", "Dataflow", "Quantization"], ["AI accelerator systolic array quantization"]),
          moduleSeed("chiplet", "Chiplet and system integration", "Frame NoC, chiplet links, thermal issues, and reliability.", ["NoC basics", "Chiplet interface", "Thermal issue"], ["chiplet architecture NoC interface"]),
        ],
      },
    ],
  },
];

const rawLessons: Array<[string, string, string, string, LessonLevel, number, string[], string[], string[]]> = [
  ["mos-small-signal", "MOS small-signal model", "analog-foundations", "mos-small-signal", "starter", 18, ["Analog & Mixed-Signal"], ["MOS small signal analog IC"], ["JSSC", "TCAS-I"]],
  ["current-mirror-accuracy", "Current mirror accuracy", "analog-foundations", "bias-mirrors", "core", 18, ["Analog & Mixed-Signal"], ["current mirror accuracy mismatch"], ["JSSC", "CICC"]],
  ["differential-pair-intuition", "Differential pair intuition", "analog-foundations", "diff-feedback", "core", 20, ["Analog & Mixed-Signal"], ["differential pair active load"], ["JSSC", "ISSCC"]],
  ["ldo-loop-stability", "LDO loop stability", "pmic", "ldo", "core", 22, ["Power Management"], ["LDO loop stability", "LDO load transient PSRR"], ["ISSCC", "JSSC", "CICC"]],
  ["switched-capacitor-charge-sharing", "Switched-capacitor charge sharing", "pmic", "sc-hybrid", "core", 20, ["Power Management"], ["switched-capacitor converter charge sharing"], ["ISSCC", "JSSC"]],
  ["sar-adc-binary-search", "SAR ADC binary search", "data-converters", "comp-cdac", "starter", 18, ["Analog & Mixed-Signal"], ["SAR ADC binary search capacitor DAC"], ["ISSCC", "JSSC"]],
  ["delta-sigma-noise-shaping", "Delta-sigma noise shaping", "data-converters", "ds-ti", "advanced", 24, ["Analog & Mixed-Signal"], ["delta sigma ADC noise shaping"], ["JSSC", "ISSCC"]],
  ["pll-loop-bandwidth", "PLL loop bandwidth", "pll-clocking", "loop", "core", 20, ["Clocking & Frequency Generation"], ["PLL loop bandwidth jitter"], ["ISSCC", "JSSC"]],
  ["phase-noise-intuition", "Phase noise intuition", "pll-clocking", "vco", "core", 22, ["Clocking & Frequency Generation"], ["LC oscillator phase noise"], ["ISSCC", "JSSC"]],
  ["noise-figure", "Noise figure", "rf-mmwave", "rf-metrics", "starter", 18, ["RF/mmWave & Wireline"], ["RF noise figure LNA"], ["RFIC", "JSSC"]],
  ["mmwave-phased-array", "mmWave phased array", "rf-mmwave", "array", "advanced", 25, ["RF/mmWave & Wireline"], ["mmWave phased array beamforming IC"], ["ISSCC", "JSSC", "RFIC"]],
  ["eye-diagram", "Eye diagram", "wireline-serdes", "channel", "starter", 16, ["RF/mmWave & Wireline"], ["wireline eye diagram SerDes"], ["ISSCC", "JSSC"]],
  ["clock-data-recovery", "Clock and data recovery", "wireline-serdes", "cdr", "core", 22, ["RF/mmWave & Wireline"], ["clock data recovery SerDes"], ["ISSCC", "JSSC"]],
  ["sram-read-stability", "6T SRAM read stability", "memory-cim", "sram", "core", 20, ["Memory & Compute-in-Memory"], ["6T SRAM read stability"], ["ISSCC", "JSSC", "VLSI Symposium"]],
  ["analog-cim", "Analog compute-in-memory", "memory-cim", "cim", "research-frontier", 25, ["Memory & Compute-in-Memory"], ["analog compute in memory macro"], ["ISSCC", "JSSC"]],
  ["analog-sizing-automation", "Analog sizing automation", "eda-cad-ai", "sizing", "research-frontier", 24, ["EDA, CAD & Verification"], ["analog circuit sizing Bayesian optimization"], ["DAC", "ICCAD"]],
  ["llm-for-eda-scripting", "LLM for EDA scripting", "eda-cad-ai", "llm", "research-frontier", 20, ["EDA, CAD & Verification"], ["LLM EDA scripting"], ["DAC", "ICCAD"]],
  ["systolic-array", "Systolic array", "digital-soc-accelerator", "accelerator", "core", 20, ["Digital IC & Architecture"], ["AI accelerator systolic array"], ["ISSCC", "ISCA", "MICRO"]],
  ["chiplet-interface", "Chiplet interface", "digital-soc-accelerator", "chiplet", "advanced", 22, ["Digital IC & Architecture"], ["chiplet interface architecture"], ["ISSCC", "VLSI Symposium"]],
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
