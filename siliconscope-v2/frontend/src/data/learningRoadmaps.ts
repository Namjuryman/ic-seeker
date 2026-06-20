export type LearningResource = {
  title: string
  kind: 'course' | 'book' | 'tool' | 'paper' | 'guide'
  provider: string
  url: string
  note: string
}

export type LearningStage = {
  title: string
  goal: string
  checkpoints: string[]
  resources: LearningResource[]
}

export type LearningRoadmap = {
  id: string
  title: string
  subtitle: string
  accent: string
  paperQuery: string
  venues: string[]
  foundation: string[]
  stages: LearningStage[]
  projectIdeas: string[]
}

export const learningSource = {
  name: 'Crys-Chen/ic-guide',
  url: 'https://github.com/Crys-Chen/ic-guide',
  note:
    '路线结构参考 Crys-Chen/ic-guide 的通用学习地图与科研方向导览；已过滤复旦课程表、FDU 课程页和复旦定向导师条目。',
}

export const learningRoadmaps: LearningRoadmap[] = [
  {
    id: 'analog-mixed-signal',
    title: '模拟与混合信号 IC',
    subtitle: 'ADC、DAC、PLL、SerDes、AFE、PMIC，是连接真实物理世界和数字 SoC 的入口。',
    accent: '#dc2626',
    paperQuery: 'ADC OR DAC OR PLL OR SerDes OR mixed-signal OR PMIC',
    venues: ['ISSCC', 'JSSC', 'VLSI', 'CICC', 'A-SSCC', 'ESSERC'],
    foundation: ['电路分析', '模拟电子线路', '信号与系统', '半导体器件', '概率统计', 'Cadence Virtuoso'],
    stages: [
      {
        title: '阶段 1：建立电路直觉',
        goal: '读懂小信号模型、反馈、噪声、失配和基本放大器结构。',
        checkpoints: ['手推差分对增益和输入范围', '解释 Miller 补偿为什么稳定运放', '用 SPICE 验证手算结论'],
        resources: [
          {
            title: 'UCLA Electronics / Razavi lectures',
            kind: 'course',
            provider: 'UCLA / B. Razavi',
            url: 'https://www.seas.ucla.edu/brweb/teaching.html',
            note: '模拟电路入门经典，适合反复看。',
          },
          {
            title: 'Design of Analog CMOS Integrated Circuits',
            kind: 'book',
            provider: 'B. Razavi',
            url: 'https://www.mheducation.com/highered/product/design-analog-cmos-integrated-circuits-razavi/M9780072524932.html',
            note: '模拟 IC 主线教材。',
          },
        ],
      },
      {
        title: '阶段 2：进入混合信号核心模块',
        goal: '围绕 ADC/DAC/PLL/SerDes 选择一个方向做深。',
        checkpoints: ['复现一个 SAR ADC behavioral model', '读 10 篇 ISSCC/JSSC 数据转换器论文', '整理 FoM、SNDR、ENOB、jitter 指标表'],
        resources: [
          {
            title: 'Murmann ADC Performance Survey',
            kind: 'guide',
            provider: 'B. Murmann',
            url: 'https://github.com/bmurmann/ADC-survey',
            note: 'ADC 指标和论文入口，非常适合建立 benchmark 感。',
          },
          {
            title: 'SiliconScope 混合信号论文搜索',
            kind: 'paper',
            provider: 'Local database',
            url: '/?q=ADC%20PLL%20SerDes&scope=all&semantic=1',
            note: '从本地论文库切入代表论文。',
          },
        ],
      },
      {
        title: '阶段 3：版图、寄生和测试闭环',
        goal: '理解为什么仿真不等于硅片，能做 post-layout 和基本测试规划。',
        checkpoints: ['画一个匹配电容阵列 layout', '跑 PEX 后比较前后仿真', '写出测试板/仪器需求清单'],
        resources: [
          {
            title: 'Cadence Virtuoso / Spectre workflow',
            kind: 'tool',
            provider: 'Cadence ecosystem',
            url: 'https://www.cadence.com/en_US/home/tools/custom-ic-analog-rf-design.html',
            note: '工业界模拟/RF 主力工具链。',
          },
        ],
      },
    ],
    projectIdeas: ['用 Verilog-A 建一个 SAR ADC 行为模型', '做一个 PLL phase-noise 论文指标表', '整理近十年 ISSCC/JSSC ADC 架构变化'],
  },
  {
    id: 'rf-mmwave',
    title: 'RF / 毫米波 IC',
    subtitle: 'LNA、PA、Mixer、VCO、PLL、相控阵和毫米波收发机，核心是频率、噪声、线性和效率的交易。',
    accent: '#1d4ed8',
    paperQuery: 'RFIC OR mmWave OR phased-array OR power amplifier OR LNA OR mixer',
    venues: ['ISSCC', 'JSSC', 'RFIC', 'IMS', 'T-MTT', 'ESSERC'],
    foundation: ['模拟电路', '电磁场与微波', '信号处理', 'S 参数', 'Smith Chart', 'EM 仿真'],
    stages: [
      {
        title: '阶段 1：从高频现象重学电路',
        goal: '接受“走线就是电路”的事实，掌握 S 参数、阻抗匹配和噪声系数。',
        checkpoints: ['会读 S11/S21', '解释 LNA 噪声匹配和功率匹配差异', '用 Smith Chart 做一个匹配网络'],
        resources: [
          {
            title: 'RF Microelectronics',
            kind: 'book',
            provider: 'B. Razavi',
            url: 'https://www.pearson.com/en-us/subject-catalog/p/rf-microelectronics/P200000003188',
            note: 'RFIC 入门主线。',
          },
        ],
      },
      {
        title: '阶段 2：收发机链路和模块指标',
        goal: '把 LNA、Mixer、VCO、PA 放回系统链路预算里理解。',
        checkpoints: ['画出 receiver cascade noise budget', '比较 PA PAE、linearization 和 back-off', '读 5 篇 phased-array 论文'],
        resources: [
          {
            title: 'SiliconScope RF/mmWave 论文搜索',
            kind: 'paper',
            provider: 'Local database',
            url: '/?q=mmWave%20phased-array%20RFIC&scope=all&semantic=1',
            note: '直接看 JSSC/ISSCC/RFIC 里的最新架构。',
          },
        ],
      },
      {
        title: '阶段 3：版图、封装和测量',
        goal: '理解 EM、封装、探针台、VNA/频谱仪如何影响真实结果。',
        checkpoints: ['跑一个 inductor EM extraction', '列出毫米波测试仪器链', '解释 de-embedding 的意义'],
        resources: [
          {
            title: 'Keysight RF measurement basics',
            kind: 'guide',
            provider: 'Keysight',
            url: 'https://www.keysight.com/us/en/assets/7018-06840/application-notes/5952-0292.pdf',
            note: '测试视角补齐 RFIC 工程闭环。',
          },
        ],
      },
    ],
    projectIdeas: ['做一个 28GHz phased-array 论文表', '整理 PA 效率/线性技术树', '复现阻抗匹配小例子'],
  },
  {
    id: 'digital-asic',
    title: '数字 IC / ASIC / SoC',
    subtitle: '从数字逻辑、HDL、验证到综合、时序收敛和后端，是把算法真正落到硅片上的路径。',
    accent: '#2563eb',
    paperQuery: 'ASIC OR SoC OR digital IC OR processor OR accelerator',
    venues: ['ISSCC', 'JSSC', 'DAC', 'ICCAD', 'ISCA', 'MICRO'],
    foundation: ['数字逻辑', 'Verilog/SystemVerilog', '计算机组成', '脚本自动化', 'Linux', '时序分析'],
    stages: [
      {
        title: '阶段 1：RTL 思维',
        goal: '把“写程序”切换成“描述并发硬件”。',
        checkpoints: ['写同步 FIFO', '写 testbench 覆盖边界条件', '理解 blocking/non-blocking 差异'],
        resources: [
          {
            title: 'Digital Design and Computer Architecture',
            kind: 'book',
            provider: 'Harris & Harris',
            url: 'https://www.elsevier.com/books/digital-design-and-computer-architecture/harris/978-0-12-820064-3',
            note: '数字逻辑到体系结构的平滑路线。',
          },
          {
            title: 'Nand2Tetris',
            kind: 'course',
            provider: 'Hebrew University',
            url: 'https://www.nand2tetris.org/',
            note: '用项目把硬件和软件栈串起来。',
          },
        ],
      },
      {
        title: '阶段 2：验证和综合',
        goal: '知道 RTL 不是终点，验证、综合和约束决定能不能交付。',
        checkpoints: ['写一个带断言的 testbench', '跑 Yosys/OpenROAD 小设计', '理解 setup/hold violation'],
        resources: [
          {
            title: 'OpenROAD flow',
            kind: 'tool',
            provider: 'OpenROAD',
            url: 'https://theopenroadproject.org/',
            note: '开源后端流程，适合做教学和验证。',
          },
        ],
      },
      {
        title: '阶段 3：系统级设计',
        goal: '围绕 cache、NoC、accelerator、memory hierarchy 做架构判断。',
        checkpoints: ['读懂一篇 accelerator 架构论文', '估算带宽/算力/片上存储瓶颈', '把论文指标转成表格'],
        resources: [
          {
            title: 'SiliconScope 架构论文搜索',
            kind: 'paper',
            provider: 'Local database',
            url: '/?q=accelerator%20processor%20SoC&scope=all&semantic=1',
            note: '把数据库里的架构方向论文接到学习路线。',
          },
        ],
      },
    ],
    projectIdeas: ['用 Verilog 写一个 tiny RISC-V 子集', '跑一次开源综合到 GDS 的 toy flow', '做 ISSCC AI accelerator 架构对比表'],
  },
  {
    id: 'eda-tools',
    title: 'EDA 与设计自动化',
    subtitle: '服务所有 IC 方向的底座：仿真、综合、布局布线、版图生成、验证和 AI for EDA。',
    accent: '#7c3aed',
    paperQuery: 'EDA OR placement OR routing OR verification OR analog layout automation',
    venues: ['DAC', 'ICCAD', 'DATE', 'TCAD', 'TCAS', 'ASP-DAC'],
    foundation: ['数据结构与算法', '图算法', '优化', 'C++/Python', '编译原理', 'VLSI CAD'],
    stages: [
      {
        title: '阶段 1：算法底座',
        goal: '把图、搜索、动态规划、线性/整数规划和启发式算法补扎实。',
        checkpoints: ['实现 topological sort', '理解 min-cut 和 shortest path', '能读懂 simulated annealing'],
        resources: [
          {
            title: 'Algorithms, Part I/II',
            kind: 'course',
            provider: 'Princeton',
            url: 'https://algs4.cs.princeton.edu/home/',
            note: 'EDA 算法前置很稳。',
          },
        ],
      },
      {
        title: '阶段 2：VLSI CAD 主线',
        goal: '理解 synthesis、placement、routing、STA 的问题建模。',
        checkpoints: ['读一个 placement benchmark', '解释 timing-driven placement', '比较 SAT/SMT 在验证里的作用'],
        resources: [
          {
            title: 'VLSI CAD: Logic to Layout',
            kind: 'course',
            provider: 'UIUC / Coursera',
            url: 'https://www.coursera.org/learn/vlsi-cad-logic',
            note: 'ic-guide 也把它放在 EDA 路线核心位置。',
          },
        ],
      },
      {
        title: '阶段 3：连接真实设计流',
        goal: '把算法接入真实 netlist、layout、timing report，而不是只跑 toy example。',
        checkpoints: ['解析 DEF/LEF 或 Verilog netlist', '跑一次 OpenROAD', '做一个 AI 辅助版图/分类小工具'],
        resources: [
          {
            title: 'SiliconScope EDA 论文搜索',
            kind: 'paper',
            provider: 'Local database',
            url: '/?q=EDA%20placement%20routing%20verification&scope=all&semantic=1',
            note: '后续可以用本地论文库生成 reading list。',
          },
        ],
      },
    ],
    projectIdeas: ['实现一个 tiny global placer', '做论文标题到 EDA 子方向的分类器', '解析 timing report 并画 dashboard'],
  },
  {
    id: 'devices-process',
    title: '器件、工艺与先进封装',
    subtitle: '从半导体物理、器件、工艺到封装，是理解 PDK、可靠性、功率器件和异构集成的根。',
    accent: '#059669',
    paperQuery: 'semiconductor device process integration advanced packaging power device',
    venues: ['IEDM', 'VLSI', 'IRPS', 'EDL', 'TED', 'ECTC'],
    foundation: ['大学物理', '量子力学', '固体物理', '半导体物理', '材料', '工艺流程'],
    stages: [
      {
        title: '阶段 1：物理和器件',
        goal: '从能带、PN 结、MOS 电容一路走到 MOSFET 工作机理。',
        checkpoints: ['画 MOS C-V 曲线', '解释 short-channel effect', '知道 FinFET/GAA 为什么出现'],
        resources: [
          {
            title: 'Semiconductor Device Fundamentals',
            kind: 'book',
            provider: 'R. F. Pierret',
            url: 'https://www.pearson.com/en-us/subject-catalog/p/semiconductor-device-fundamentals/P200000003176',
            note: '器件入门经典。',
          },
        ],
      },
      {
        title: '阶段 2：工艺、PDK 和可靠性',
        goal: '知道版图规则背后的工艺约束，以及可靠性为什么会限制电路。',
        checkpoints: ['读一份 DRC/LVS rule 摘要', '理解 BEOL/FEOL 差异', '整理 BTI/HCI/EM 关键词'],
        resources: [
          {
            title: 'SiliconScope 器件工艺论文搜索',
            kind: 'paper',
            provider: 'Local database',
            url: '/?q=FinFET%20GAA%20process%20integration&scope=all&semantic=1',
            note: '看 IEDM/VLSI 的方向变化。',
          },
        ],
      },
      {
        title: '阶段 3：封装与系统集成',
        goal: '理解 chiplet、HBM、2.5D/3D integration 和先进封装对系统性能的影响。',
        checkpoints: ['画出 2.5D interposer 数据路径', '比较 monolithic SoC 与 chiplet trade-off', '读一篇封装互连论文'],
        resources: [
          {
            title: 'Heterogeneous Integration Roadmap',
            kind: 'guide',
            provider: 'HIR',
            url: 'https://eps.ieee.org/technology/heterogeneous-integration-roadmap.html',
            note: '先进封装和异构集成的大图景。',
          },
        ],
      },
    ],
    projectIdeas: ['做 FinFET/GAA 论文时间线', '整理可靠性关键词和对应失效机理', '做 chiplet/interposer 典型系统图谱'],
  },
]
