export type TopicNode = {
  id: string;
  label: string;
  parentId?: string;
  aliases: string[];
  positiveKeywords: string[];
  negativeKeywords: string[];
  domain: string;
};

export const topicNodes: TopicNode[] = [
  { id: "pmic", label: "PMIC", domain: "Power Management", aliases: ["power management", "power ic", "power converter"], positiveKeywords: ["pmic", "power management", "voltage regulator"], negativeKeywords: ["power amplifier"] },
  { id: "pmic-ldo", parentId: "pmic", label: "LDO", domain: "Power Management", aliases: ["low-dropout regulator", "linear regulator"], positiveKeywords: ["ldo", "low dropout", "linear regulator"], negativeKeywords: [] },
  { id: "pmic-buck", parentId: "pmic", label: "Buck Converter", domain: "Power Management", aliases: ["step-down converter"], positiveKeywords: ["buck", "step-down", "down converter"], negativeKeywords: [] },
  { id: "pmic-boost", parentId: "pmic", label: "Boost Converter", domain: "Power Management", aliases: ["step-up converter"], positiveKeywords: ["boost", "step-up"], negativeKeywords: [] },
  { id: "pmic-switched-cap", parentId: "pmic", label: "Switched-Capacitor Converter", domain: "Power Management", aliases: ["SC converter", "charge pump converter"], positiveKeywords: ["switched-capacitor", "switched capacitor", "charge pump"], negativeKeywords: [] },
  { id: "pmic-hybrid", parentId: "pmic", label: "Hybrid Converter", domain: "Power Management", aliases: ["hybrid SC converter", "dual-path hybrid"], positiveKeywords: ["hybrid converter", "dual-path", "dph", "hybrid switched"], negativeKeywords: [] },
  { id: "pmic-digital-ldo", parentId: "pmic", label: "Digital LDO", domain: "Power Management", aliases: ["DLDO"], positiveKeywords: ["digital ldo", "dldo"], negativeKeywords: [] },
  { id: "pmic-3d-power", parentId: "pmic", label: "3D Power Delivery", domain: "Power Management", aliases: ["integrated voltage regulator", "IVR"], positiveKeywords: ["3d power", "integrated voltage regulator", "ivr", "power delivery"], negativeKeywords: [] },

  { id: "adc", label: "ADC", domain: "Analog & Mixed-Signal", aliases: ["data converter", "analog-to-digital converter"], positiveKeywords: ["adc", "analog-to-digital", "data converter"], negativeKeywords: ["audio codec"] },
  { id: "adc-sar", parentId: "adc", label: "SAR ADC", domain: "Analog & Mixed-Signal", aliases: ["successive approximation adc"], positiveKeywords: ["sar adc", "successive approximation"], negativeKeywords: [] },
  { id: "adc-pipeline", parentId: "adc", label: "Pipeline ADC", domain: "Analog & Mixed-Signal", aliases: ["pipelined adc"], positiveKeywords: ["pipeline adc", "pipelined adc"], negativeKeywords: [] },
  { id: "adc-delta-sigma", parentId: "adc", label: "Delta-Sigma ADC", domain: "Analog & Mixed-Signal", aliases: ["sigma-delta adc", "DSM"], positiveKeywords: ["delta-sigma", "sigma-delta", "ctsd", "dsm"], negativeKeywords: [] },
  { id: "adc-time-interleaved", parentId: "adc", label: "Time-Interleaved ADC", domain: "Analog & Mixed-Signal", aliases: ["TI ADC"], positiveKeywords: ["time-interleaved", "interleaved adc"], negativeKeywords: [] },
  { id: "adc-calibration", parentId: "adc", label: "ADC Calibration", domain: "Analog & Mixed-Signal", aliases: ["background calibration"], positiveKeywords: ["adc calibration", "background calibration", "mismatch calibration"], negativeKeywords: [] },

  { id: "pll", label: "PLL and Clocking", domain: "Clocking & Frequency Generation", aliases: ["clock generator", "frequency synthesizer"], positiveKeywords: ["pll", "clock generator", "frequency synthesizer"], negativeKeywords: [] },
  { id: "pll-charge-pump", parentId: "pll", label: "Charge-Pump PLL", domain: "Clocking & Frequency Generation", aliases: ["CPPLL"], positiveKeywords: ["charge-pump pll", "cppll"], negativeKeywords: [] },
  { id: "pll-fractional-n", parentId: "pll", label: "Fractional-N PLL", domain: "Clocking & Frequency Generation", aliases: ["frac-n pll"], positiveKeywords: ["fractional-n", "fractional n", "frac-n"], negativeKeywords: [] },
  { id: "pll-adpll", parentId: "pll", label: "ADPLL", domain: "Clocking & Frequency Generation", aliases: ["all-digital pll"], positiveKeywords: ["adpll", "all-digital pll"], negativeKeywords: [] },
  { id: "pll-mdll", parentId: "pll", label: "MDLL", domain: "Clocking & Frequency Generation", aliases: ["multiplying delay-locked loop"], positiveKeywords: ["mdll", "multiplying delay"], negativeKeywords: [] },
  { id: "pll-injection-locking", parentId: "pll", label: "Injection Locking", domain: "Clocking & Frequency Generation", aliases: ["injection-locked oscillator"], positiveKeywords: ["injection locking", "injection-locked"], negativeKeywords: [] },

  { id: "rf", label: "RF/mmWave", domain: "RF/mmWave & Wireline", aliases: ["wireless ic", "mmwave"], positiveKeywords: ["rf", "mmwave", "millimeter-wave", "wireless"], negativeKeywords: [] },
  { id: "rf-pa", parentId: "rf", label: "Power Amplifier", domain: "RF/mmWave & Wireline", aliases: ["PA"], positiveKeywords: ["power amplifier", "pa"], negativeKeywords: ["power management"] },
  { id: "rf-lna", parentId: "rf", label: "Low-Noise Amplifier", domain: "RF/mmWave & Wireline", aliases: ["LNA"], positiveKeywords: ["low-noise amplifier", "lna"], negativeKeywords: [] },
  { id: "rf-mixer", parentId: "rf", label: "Mixer and Frequency Conversion", domain: "RF/mmWave & Wireline", aliases: ["upconversion", "downconversion"], positiveKeywords: ["mixer", "upconversion", "downconversion"], negativeKeywords: [] },
  { id: "serdes", label: "SerDes and Wireline", domain: "RF/mmWave & Wireline", aliases: ["wireline transceiver"], positiveKeywords: ["serdes", "wireline", "cdr", "equalizer"], negativeKeywords: ["wireless"] },

  { id: "memory", label: "Memory and Compute-in-Memory", domain: "Memory & Compute-in-Memory", aliases: ["CIM", "PIM"], positiveKeywords: ["memory", "sram", "dram", "mram", "rram", "compute-in-memory", "cim"], negativeKeywords: [] },
  { id: "memory-sram", parentId: "memory", label: "SRAM", domain: "Memory & Compute-in-Memory", aliases: ["static ram"], positiveKeywords: ["sram", "static random access"], negativeKeywords: [] },
  { id: "memory-cim", parentId: "memory", label: "Compute-in-Memory", domain: "Memory & Compute-in-Memory", aliases: ["CIM", "PIM", "in-memory computing"], positiveKeywords: ["compute-in-memory", "in-memory", "cim", "pim"], negativeKeywords: [] },
  { id: "memory-nvm", parentId: "memory", label: "NVM / MRAM / RRAM", domain: "Memory & Compute-in-Memory", aliases: ["non-volatile memory"], positiveKeywords: ["nvm", "mram", "rram", "reram", "nonvolatile"], negativeKeywords: [] },

  { id: "eda", label: "EDA, CAD and Verification", domain: "EDA, CAD & Verification", aliases: ["design automation", "verification"], positiveKeywords: ["eda", "cad", "verification", "formal", "synthesis", "place and route"], negativeKeywords: [] },
  { id: "device", label: "Devices, Process and Integration", domain: "Devices, Process & 3D Integration", aliases: ["process", "device"], positiveKeywords: ["device", "process", "finfet", "gaa", "3d integration"], negativeKeywords: [] },
];
