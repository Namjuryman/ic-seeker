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
      intuition: "数据转换器是在热噪声、量化、比较器判决时间、电容失配和数字校准之间分配预算。读 ADC 论文时先看指标预算，不要只记拓扑名字。",
      minimalBlock: "输入采样 -> DAC/残差路径 -> 比较器/放大器 -> 数字逻辑/校准 -> 输出码",
      equations: ["ENOB = (SNDR - 1.76) / 6.02", "Walden FoM = Power / (2^ENOB * fs)", "kT/C 噪声决定采样电容下限"],
      specs: ["输入频率下的 SNDR/ENOB", "采样率", "功耗", "面积", "校准开销", "工艺节点"],
      pitfalls: ["用同一个 FoM 直接比较 Nyquist 与过采样转换器", "忽略校准功耗", "缺少输入频率和测量带宽"],
      paperDirections: ["ISSCC/JSSC ADC 指标表", "SAR 电容 DAC 失配校准", "delta-sigma 环路稳定性与量化噪声整形"],
    },
  },
  {
    test: /pll|phase noise|jitter|adpll|clock/i,
    kind: "clocking",
    payload: {
      intuition: "PLL 把带噪振荡器相位变成可控时钟资源，本质是在环路带宽内塑形参考噪声、分频噪声、振荡器噪声和量化噪声。",
      minimalBlock: "参考时钟 -> PFD/TDC -> 环路滤波/数字滤波 -> VCO/DCO -> 分频器 -> 反馈",
      equations: ["积分抖动来自指定 offset 频段内相噪谱密度的积分", "环路带宽决定参考跟踪和 VCO 噪声抑制的取舍", "spur 常来自周期性量化、失配或电源调制"],
      specs: ["rms jitter", "相噪 offset", "spur 水平", "功耗", "频率范围", "锁定时间"],
      pitfalls: ["只报 jitter 但不报积分频段", "脱离面积/频率语境比较 ring 和 LC 振荡器", "忽略 supply pushing 和参考 spur"],
      paperDirections: ["ADPLL TDC/DTC 量化", "jitter-cleaning PLL", "fractional-N spur 抑制"],
    },
  },
  {
    test: /ldo|dc-dc|buck|boost|power|pmic|converter classification/i,
    kind: "power-management",
    payload: {
      intuition: "PMIC 是真实负载、封装、效率和瞬态约束下的控制环路工程。拓扑重要，但补偿网络和寄生参数常常决定流片表现。",
      minimalBlock: "功率级 -> 误差感测 -> 补偿/控制 -> 栅驱动/通过器件 -> 输出电容/负载",
      equations: ["Efficiency = Pout / Pin", "负载瞬态 undershoot 取决于环路带宽、输出电容和电流斜率", "PSRR 随频率变化，并会在环路带宽或通过器件极限附近塌陷"],
      specs: ["效率曲线", "负载瞬态", "线性/负载调整率", "PSRR", "静态电流", "电感/电容假设"],
      pitfalls: ["只展示单点峰值效率", "省略外部无源器件条件", "没有区分小信号稳定性和大信号瞬态"],
      paperDirections: ["hybrid switched-capacitor converter", "数字控制 PMIC", "快速瞬态 LDO"],
    },
  },
  {
    test: /serdes|pam4|cdr|equalization|eye/i,
    kind: "wireline",
    payload: {
      intuition: "有线链路用功耗换取在有损信道中恢复时钟和符号。眼图是信道损耗、抖动、均衡和判决裕量的压缩表达。",
      minimalBlock: "TX driver/equalizer -> channel/package -> CTLE/VGA -> CDR -> slicer/DFE -> digital adaptation",
      equations: ["UI = 1 / data_rate", "BER 目标决定所需眼图裕量", "均衡提升信号的同时也可能放大噪声或误差传播"],
      specs: ["Gb/s per lane", "pJ/bit", "BER", "信道损耗", "jitter tolerance", "自适应方法"],
      pitfalls: ["比较不同信道损耗下的链路", "忽略测试 pattern 和 BER 外推方式", "把 PAM4 与 NRZ 的裕量当作可直接互换"],
      paperDirections: ["PAM4 CDR", "DFE 自适应", "chiplet die-to-die 链路"],
    },
  },
  {
    test: /rf|mmwave|noise figure|phased|lna|transceiver/i,
    kind: "rf-mmwave",
    payload: {
      intuition: "RF IC 论文关心的是在阻抗、频率、相位和噪声转换中尽量保留信息。读指标时要把增益、噪声和线性度放在一起看。",
      minimalBlock: "天线/匹配 -> LNA/mixer/PLL -> baseband/filter/ADC 或 PA/driver -> 封装/天线接口",
      equations: ["Friis 公式解释为什么第一级 NF 主导系统噪声", "IIP3 描述两音假设下的三阶线性度", "阵列增益和相位误差共同塑造波束成形表现"],
      specs: ["噪声系数", "增益", "IIP3/P1dB", "相噪", "EVM", "频段/频率", "阵列规模"],
      pitfalls: ["比较中省略频率和带宽", "把封装/天线损耗藏在芯片指标之外", "NF/增益/线性度来自不同偏置点"],
      paperDirections: ["mmWave phased array", "低功耗 BLE/Wi-Fi transceiver", "RF front-end co-design"],
    },
  },
  {
    test: /sram|memory|cim|compute/i,
    kind: "memory-cim",
    payload: {
      intuition: "Memory 和 CIM 论文在密度、稳定性、感测裕量、ADC 开销和 workload 映射之间取舍。好的 CIM 结果必须经得起系统级能耗核算。",
      minimalBlock: "bitcell array -> wordline/bitline -> sense/ADC -> peripheral digital accumulation -> memory controller",
      equations: ["读静态噪声裕量取决于 cell ratio 和工艺变化", "CIM 能耗必须计入 ADC/DAC、驱动和累加", "TOPS/W 依赖 workload 与精度设定"],
      specs: ["bitcell 面积", "Vmin", "读/写裕量", "精度", "ADC 开销", "macro vs system energy"],
      pitfalls: ["只统计阵列能量", "忽略 retraining 或 accuracy loss", "比较不同 bit precision 或 sparsity 假设"],
      paperDirections: ["SRAM Vmin assist", "analog CIM ADC sharing", "RRAM/MRAM compute macro"],
    },
  },
  {
    test: /rtl|asic|systolic|tops|soc|cdc|fsm/i,
    kind: "digital-architecture",
    payload: {
      intuition: "数字 IC 把 workload 结构转成数据搬运、并行度、时序收敛和验证成本。真正昂贵的常常不是计算，而是搬运 bit。",
      minimalBlock: "workload model -> datapath -> memory hierarchy -> control/NoC -> verification/timing/power closure",
      equations: ["Throughput = operations per cycle * frequency", "Energy = compute energy + memory movement + clock/control overhead", "利用率通常比峰值 TOPS 更关键"],
      specs: ["频率", "面积", "功耗", "memory bandwidth", "利用率", "benchmark 设置", "工艺节点"],
      pitfalls: ["只报 peak TOPS 不报 utilization", "忽略 off-chip memory", "没有区分 post-layout 和 pre-layout 数字"],
      paperDirections: ["AI accelerator dataflow", "RISC-V SoC integration", "near-memory compute"],
    },
  },
  {
    test: /eda|placement|routing|sta|verification|dft|assertion|coverage/i,
    kind: "eda-verification",
    payload: {
      intuition: "EDA 和验证论文要按目标、约束集、benchmark 和失败模式来读。只有平均指标更好还不够，还要看可复现性和 corner 覆盖。",
      minimalBlock: "design database -> constraints -> algorithm/model -> signoff metric -> reproducibility/evaluation harness",
      equations: ["优化目标通常是 wirelength/timing/power/congestion 的加权组合", "Coverage = exercised behavior / intended behavior", "benchmark leakage 会带来虚假的置信度"],
      specs: ["benchmark suite", "runtime", "QoR", "corner setup", "开源可复现性", "工业真实性"],
      pitfalls: ["benchmark 过拟合", "约束条件不清楚", "缺少消融实验或 runtime scaling"],
      paperDirections: ["ML for placement/routing", "formal verification", "DFT/ATPG/BIST"],
    },
  },
];

const fallbackPayload: CircuitPayload = {
  problem: "把电路/系统概念映射到具体 IC 设计决策，再判断哪些论文元数据、指标和会议/期刊通常能提供可信证据。",
  intuition: "把这个主题当作工程取舍空间来读：它在平衡什么物理极限、架构选择、测量设置和应用约束？",
  minimalBlock: "问题 -> 电路/系统模块 -> 主导非理想因素 -> 测量指标 -> 论文对比表",
  equations: ["读论文前先写出一阶关系", "把每个公式的假设写在旁边", "检查不同论文的指标是否使用相同条件"],
  specs: ["工艺节点", "供电", "频率/带宽", "功耗", "面积", "测量条件", "应用目标"],
  tradeoffs: ["性能 vs 功耗", "面积 vs 鲁棒性", "校准 vs 模拟精度", "benchmark 简洁性 vs 真实部署"],
  pitfalls: ["比较条件缺失的论文", "把元数据指标当成完整判断", "忽略来源完整度和会议/期刊范围"],
  paperDirections: ["先看代表论文", "建立指标表", "选题前观察会议/期刊和年份趋势"],
  searches: ["integrated circuit", "solid-state circuit"],
  quiz: ["主导非理想因素是什么？", "哪个指标最可能在硅上先失效？", "哪组论文对比不公平，为什么？"],
  next: "把两篇相关论文加入阅读队列，并写一段话总结指标假设。",
  caveat: "学习内容仅供辅助。公式、测量和设计建议仍需用原论文、教材、datasheet 和指导教师或专业意见复核。",
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
