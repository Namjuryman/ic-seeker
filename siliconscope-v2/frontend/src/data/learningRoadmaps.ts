export type LearningResource = {
  title: string
  kind: 'course' | 'book' | 'tool' | 'paper' | 'guide'
  provider: string
  url: string
  note: string
}

export type FoundationGroup = {
  title: string
  note: string
  items: string[]
}

export type RouteFamily = {
  id: string
  title: string
  description: string
  routeIds: string[]
}

export type LearningStage = {
  title: string
  goal: string
  checkpoints: string[]
  resources: LearningResource[]
}

export type LearningRoadmap = {
  id: string
  family: string
  title: string
  subtitle: string
  level: '入门友好' | '中等门槛' | '高门槛' | '研究导向'
  accent: string
  paperQuery: string
  venues: string[]
  foundation: string[]
  prerequisites: FoundationGroup[]
  outcomes: string[]
  stages: LearningStage[]
  projectIdeas: string[]
}

export const learningSource = {
  name: 'Crys-Chen/ic-guide',
  url: 'https://github.com/Crys-Chen/ic-guide',
  note:
    '路线结构参考 Crys-Chen/ic-guide 的通用学习地图与科研方向导览；已过滤复旦课程表、FDU 课程页和复旦定向导师条目。',
}

export const commonFoundations: FoundationGroup[] = [
  {
    title: '数学底座',
    note: '电路、器件、信号和优化都会回到这些基础。',
    items: ['微积分与常微分方程', '线性代数', '概率统计', '复变函数基础', '数值优化', '图论与组合优化'],
  },
  {
    title: '物理与器件',
    note: '理解 PDK、噪声、寄生、可靠性和先进节点的共同语言。',
    items: ['大学物理', '电磁场与电磁波', '量子力学入门', '固体物理', '半导体物理', '半导体器件'],
  },
  {
    title: '电路与系统',
    note: '大多数 IC 路线都需要至少知道信号如何在电路和系统之间流动。',
    items: ['电路分析', '模拟电子线路', '数字逻辑', '信号与系统', '数字信号处理', '计算机组成'],
  },
  {
    title: '工程工具',
    note: '能把知识落到仿真、版图、验证、数据分析和论文复现。',
    items: ['Linux 与 Git', 'Python / MATLAB', 'SPICE 仿真', 'Verilog/SystemVerilog', 'Cadence / Synopsys / Siemens EDA', '论文阅读与指标表'],
  },
]

export const routeFamilies: RouteFamily[] = [
  {
    id: 'circuit',
    title: '电路设计路线',
    description: '模拟、混合信号、射频、电源、传感接口，是最贴近晶体管和真实信号的 IC 路线。',
    routeIds: ['analog-mixed-signal', 'rf-mmwave', 'power-management', 'bio-sensor-mems'],
  },
  {
    id: 'digital-system',
    title: '数字系统路线',
    description: 'RTL、验证、SoC、处理器、AI 加速器、FPGA，把算法和系统架构变成硬件。',
    routeIds: ['digital-asic', 'verification-dft', 'architecture-accelerator', 'fpga-reconfigurable'],
  },
  {
    id: 'device-manufacturing',
    title: '器件制造路线',
    description: '器件、工艺、功率半导体、先进封装，是理解芯片物理边界和系统集成的底层路线。',
    routeIds: ['devices-process', 'power-devices', 'advanced-packaging'],
  },
  {
    id: 'cad-security',
    title: '工具与可信路线',
    description: 'EDA、硬件安全、可靠性和测试，连接研究算法、工业流程与可信交付。',
    routeIds: ['eda-tools', 'hardware-security'],
  },
  {
    id: 'frontier',
    title: '交叉前沿路线',
    description: '存算、硅光、量子、类脑等方向不一定适合第一站，但值得作为长期视野。',
    routeIds: ['memory-cim', 'silicon-photonics', 'quantum-neuromorphic'],
  },
]

const localSearch = (query: string) => `/?q=${encodeURIComponent(query)}&scope=all&semantic=1`

export const learningRoadmaps: LearningRoadmap[] = [
  {
    id: 'analog-mixed-signal',
    family: 'circuit',
    title: '模拟与混合信号 IC',
    subtitle: 'ADC、DAC、PLL、SerDes、AFE、PMIC，是连接真实物理世界和数字 SoC 的入口。',
    level: '高门槛',
    accent: '#dc2626',
    paperQuery: 'ADC OR DAC OR PLL OR SerDes OR mixed-signal OR PMIC',
    venues: ['ISSCC', 'JSSC', 'VLSI', 'CICC', 'A-SSCC', 'ESSERC'],
    foundation: ['电路分析', '模拟电子线路', '信号与系统', '半导体器件', '概率统计', 'Cadence Virtuoso'],
    prerequisites: [
      { title: '必须先会', note: '没有这些会看不懂指标和波形。', items: ['小信号模型', '反馈与稳定性', '噪声与失配', '采样与量化', 'SPICE 仿真'] },
      { title: '继续加深', note: '读论文和流片时逐渐补。', items: ['版图匹配', '寄生提取', '数据转换器 FoM', '时钟抖动', '实验测试'] },
    ],
    outcomes: ['能读懂 ADC/PLL/SerDes/PMIC 论文指标', '能复现模块级仿真', '能把架构、版图、测试连成闭环'],
    stages: [
      {
        title: '阶段 1：建立电路直觉',
        goal: '读懂小信号模型、反馈、噪声、失配和基本放大器结构。',
        checkpoints: ['手推差分对增益和输入范围', '解释 Miller 补偿为什么稳定运放', '用 SPICE 验证手算结论'],
        resources: [
          { title: 'UCLA Electronics / Razavi lectures', kind: 'course', provider: 'UCLA / B. Razavi', url: 'https://www.seas.ucla.edu/brweb/teaching.html', note: '模拟电路入门经典，适合反复看。' },
          { title: 'Design of Analog CMOS Integrated Circuits', kind: 'book', provider: 'B. Razavi', url: 'https://www.mheducation.com/highered/product/design-analog-cmos-integrated-circuits-razavi/M9780072524932.html', note: '模拟 IC 主线教材。' },
        ],
      },
      {
        title: '阶段 2：进入核心模块',
        goal: '围绕 ADC/DAC/PLL/SerDes/PMIC 选择一个方向做深。',
        checkpoints: ['复现一个 SAR ADC behavioral model', '读 10 篇 ISSCC/JSSC 数据转换器论文', '整理 FoM、SNDR、ENOB、jitter 指标表'],
        resources: [
          { title: 'Murmann ADC Performance Survey', kind: 'guide', provider: 'B. Murmann', url: 'https://github.com/bmurmann/ADC-survey', note: 'ADC 指标和论文入口，非常适合建立 benchmark 感。' },
          { title: 'SiliconScope 混合信号论文搜索', kind: 'paper', provider: 'Local database', url: localSearch('ADC PLL SerDes PMIC'), note: '从本地论文库切入代表论文。' },
        ],
      },
      {
        title: '阶段 3：版图、寄生和测试',
        goal: '理解为什么仿真不等于硅片，能做 post-layout 和基本测试规划。',
        checkpoints: ['画一个匹配电容阵列 layout', '跑 PEX 后比较前后仿真', '写出测试板/仪器需求清单'],
        resources: [
          { title: 'Cadence custom IC flow', kind: 'tool', provider: 'Cadence', url: 'https://www.cadence.com/en_US/home/tools/custom-ic-analog-rf-design.html', note: '工业界模拟/RF 主力工具链。' },
        ],
      },
    ],
    projectIdeas: ['用 Verilog-A 建一个 SAR ADC 行为模型', '做 PLL phase-noise 论文指标表', '整理近十年 ISSCC/JSSC ADC 架构变化'],
  },
  {
    id: 'rf-mmwave',
    family: 'circuit',
    title: 'RF / 毫米波 IC',
    subtitle: 'LNA、PA、Mixer、VCO、PLL、相控阵和毫米波收发机，核心是频率、噪声、线性和效率的交易。',
    level: '高门槛',
    accent: '#1d4ed8',
    paperQuery: 'RFIC OR mmWave OR phased-array OR power amplifier OR LNA OR mixer',
    venues: ['ISSCC', 'JSSC', 'RFIC', 'IMS', 'T-MTT', 'ESSERC'],
    foundation: ['模拟电路', '电磁场与微波', '信号处理', 'S 参数', 'Smith Chart', 'EM 仿真'],
    prerequisites: [
      { title: '必须先会', note: 'RF 的第一道门槛是高频电路语言。', items: ['阻抗匹配', 'S 参数', '噪声系数', '非线性与线性度', '频谱与调制'] },
      { title: '继续加深', note: '毫米波和相控阵需要系统、封装、测试一起看。', items: ['相控阵', 'PA 效率', 'PLL 相噪', 'EM/封装寄生', 'VNA/频谱仪测试'] },
    ],
    outcomes: ['能读懂收发机链路预算', '能比较 LNA/PA/PLL 指标', '能理解毫米波版图和测试难点'],
    stages: [
      {
        title: '阶段 1：从高频现象重学电路',
        goal: '接受“走线就是电路”的事实，掌握 S 参数、阻抗匹配和噪声系数。',
        checkpoints: ['会读 S11/S21', '解释 LNA 噪声匹配和功率匹配差异', '用 Smith Chart 做一个匹配网络'],
        resources: [{ title: 'RF Microelectronics', kind: 'book', provider: 'B. Razavi', url: 'https://www.pearson.com/en-us/subject-catalog/p/rf-microelectronics/P200000003188', note: 'RFIC 入门主线。' }],
      },
      {
        title: '阶段 2：收发机链路和模块指标',
        goal: '把 LNA、Mixer、VCO、PA 放回系统链路预算里理解。',
        checkpoints: ['画 receiver cascade noise budget', '比较 PA PAE、linearization 和 back-off', '读 5 篇 phased-array 论文'],
        resources: [{ title: 'SiliconScope RF/mmWave 论文搜索', kind: 'paper', provider: 'Local database', url: localSearch('mmWave phased-array RFIC PA LNA'), note: '直接看 JSSC/ISSCC/RFIC 里的最新架构。' }],
      },
      {
        title: '阶段 3：版图、封装和测量',
        goal: '理解 EM、封装、探针台、VNA/频谱仪如何影响真实结果。',
        checkpoints: ['跑一个 inductor EM extraction', '列出毫米波测试仪器链', '解释 de-embedding 的意义'],
        resources: [{ title: 'Keysight RF measurement basics', kind: 'guide', provider: 'Keysight', url: 'https://www.keysight.com/us/en/assets/7018-06840/application-notes/5952-0292.pdf', note: '测试视角补齐 RFIC 工程闭环。' }],
      },
    ],
    projectIdeas: ['做 28GHz phased-array 论文表', '整理 PA 效率/线性技术树', '复现阻抗匹配小例子'],
  },
  {
    id: 'power-management',
    family: 'circuit',
    title: '电源管理 IC / PMIC',
    subtitle: 'LDO、Buck/Boost、Switched-Cap、Charge Pump、BMS，是所有 SoC 和移动设备的供电基础。',
    level: '中等门槛',
    accent: '#f59e0b',
    paperQuery: 'PMIC OR LDO OR DC-DC OR buck converter OR switched-capacitor',
    venues: ['ISSCC', 'JSSC', 'CICC', 'A-SSCC', 'TCAS-I', 'TPEL'],
    foundation: ['模拟电路', '功率电子', '控制理论', '开关电源', '版图寄生', '热与可靠性'],
    prerequisites: [
      { title: '必须先会', note: '电源方向既看电路，也看能量和控制。', items: ['运放与基准', '反馈补偿', '电感/电容能量', '开关损耗', '负载瞬态'] },
      { title: '继续加深', note: '高性能 PMIC 常常卡在效率、面积、EMI 和可靠性。', items: ['多相 Buck', 'SC converter', '数字控制', '封装寄生', '电池管理'] },
    ],
    outcomes: ['能判断 DC-DC/LDO 架构归属', '能读懂效率曲线和 transient 指标', '能把 PMIC 论文正确归到电源方向'],
    stages: [
      {
        title: '阶段 1：模拟基础和电源基本单元',
        goal: '理解 bandgap、error amplifier、pass device、power switch 等基础块。',
        checkpoints: ['画出 LDO 小信号环路', '解释 dropout 和 PSRR', '比较 Buck/Boost/Buck-Boost'],
        resources: [{ title: 'Power Management Integrated Circuits', kind: 'book', provider: 'Springer / Analog IC texts', url: 'https://link.springer.com/book/10.1007/978-3-319-10780-4', note: 'PMIC 方向系统性读物之一。' }],
      },
      {
        title: '阶段 2：开关电源和稳定性',
        goal: '把电力电子的平均模型、补偿和效率分析接到片上实现。',
        checkpoints: ['推 Buck CCM/DCM 基本关系', '解释 Type-II/Type-III compensation', '读懂 load transient 图'],
        resources: [{ title: 'SiliconScope PMIC 论文搜索', kind: 'paper', provider: 'Local database', url: localSearch('LDO DC-DC converter switched-capacitor PMIC'), note: '补齐本地 PMIC 论文 reading list。' }],
      },
      {
        title: '阶段 3：高集成与系统约束',
        goal: '处理多电源域、封装、电磁干扰、热和可靠性问题。',
        checkpoints: ['整理一个手机 PMIC rail map', '比较 inductive 与 switched-cap 架构', '做近十年 ISSCC PMIC 指标表'],
        resources: [{ title: 'IEEE TPEL topic search', kind: 'guide', provider: 'IEEE Xplore', url: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=63', note: '功率电子和电源控制的补充入口。' }],
      },
    ],
    projectIdeas: ['做 LDO/BUCK/SC converter 架构表', '把 DC-DC 论文从 RFIC 误分类中纠正出来', '整理 PMIC 强校/强导师列表'],
  },
  {
    id: 'bio-sensor-mems',
    family: 'circuit',
    title: '传感接口 / 生物电子 / MEMS',
    subtitle: 'AFE、神经接口、图像传感读出、MEMS 传感和植入式系统，把低噪声模拟前端接到真实世界。',
    level: '研究导向',
    accent: '#10b981',
    paperQuery: 'analog front-end sensor interface neural recording MEMS biomedical IC',
    venues: ['ISSCC', 'JSSC', 'TBioCAS', 'Sensors Journal', 'MEMS', 'Transducers'],
    foundation: ['低噪声模拟', '传感器物理', '信号处理', '生物电基础', 'ADC', '低功耗系统'],
    prerequisites: [
      { title: '必须先会', note: '传感接口首先是低噪声、低功耗、抗干扰。', items: ['运放噪声', 'chopper / auto-zero', '仪表放大器', '滤波器', '低功耗 ADC'] },
      { title: '继续加深', note: '不同传感器对应不同物理和系统约束。', items: ['电化学/电容/光学传感', '神经信号频段', '图像传感读出', 'MEMS 工艺', '无线供能'] },
    ],
    outcomes: ['能区分 AFE/ADC/传感器本体', '能读懂 input-referred noise', '能理解生物医疗芯片的功耗和安全约束'],
    stages: [
      {
        title: '阶段 1：低噪声模拟前端',
        goal: '围绕微弱信号读出，建立 noise、offset、CMRR 和滤波直觉。',
        checkpoints: ['计算 input-referred noise', '解释 chopper 稳零', '画 EEG/ECG AFE 框图'],
        resources: [{ title: 'SiliconScope sensor AFE 搜索', kind: 'paper', provider: 'Local database', url: localSearch('sensor interface AFE neural recording biomedical IC'), note: '从论文库切入 AFE 和神经接口。' }],
      },
      {
        title: '阶段 2：传感器和系统',
        goal: '把电路接到具体物理量，理解传感器输出模型和系统约束。',
        checkpoints: ['比较电容/电化学/光学读出', '整理一个 implantable system block diagram', '读一篇图像传感器 readout 论文'],
        resources: [{ title: 'IEEE TBioCAS', kind: 'guide', provider: 'IEEE', url: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=4156126', note: '生物电路和系统方向常见期刊。' }],
      },
      {
        title: '阶段 3：小型化、无线和可靠性',
        goal: '考虑植入、可穿戴、长期漂移和安全标准。',
        checkpoints: ['整理无线供能方案', '解释 electrode offset 问题', '比较可穿戴和植入式功耗预算'],
        resources: [{ title: 'MEMS Journal', kind: 'guide', provider: 'IEEE', url: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=84', note: 'MEMS 器件和微系统补充入口。' }],
      },
    ],
    projectIdeas: ['做神经接口 AFE 指标表', '整理 image sensor readout 架构', '做传感器类型和读出电路映射表'],
  },
  {
    id: 'digital-asic',
    family: 'digital-system',
    title: '数字 IC / ASIC / SoC',
    subtitle: '从数字逻辑、HDL、验证到综合、时序收敛和后端，是把算法真正落到硅片上的路径。',
    level: '入门友好',
    accent: '#2563eb',
    paperQuery: 'ASIC OR SoC OR digital IC OR processor OR accelerator',
    venues: ['ISSCC', 'JSSC', 'DAC', 'ICCAD', 'ISCA', 'MICRO'],
    foundation: ['数字逻辑', 'Verilog/SystemVerilog', '计算机组成', '脚本自动化', 'Linux', '时序分析'],
    prerequisites: [
      { title: '必须先会', note: '数字设计入门相对清晰，但工程细节很多。', items: ['组合/时序逻辑', 'FSM', 'Verilog RTL', 'testbench', '时钟/复位'] },
      { title: '继续加深', note: '走向 ASIC 要补工具流和物理实现。', items: ['综合', 'STA', 'UPF 低功耗', 'CDC/RDC', '后端约束'] },
    ],
    outcomes: ['能写可综合 RTL', '能跑基本仿真和综合', '能读 SoC/ASIC 论文的面积功耗频率指标'],
    stages: [
      {
        title: '阶段 1：RTL 思维',
        goal: '把“写程序”切换成“描述并发硬件”。',
        checkpoints: ['写同步 FIFO', '写 testbench 覆盖边界条件', '理解 blocking/non-blocking 差异'],
        resources: [
          { title: 'Digital Design and Computer Architecture', kind: 'book', provider: 'Harris & Harris', url: 'https://www.elsevier.com/books/digital-design-and-computer-architecture/harris/978-0-12-820064-3', note: '数字逻辑到体系结构的平滑路线。' },
          { title: 'Nand2Tetris', kind: 'course', provider: 'Hebrew University', url: 'https://www.nand2tetris.org/', note: '用项目把硬件和软件栈串起来。' },
        ],
      },
      {
        title: '阶段 2：验证和综合',
        goal: '知道 RTL 不是终点，验证、综合和约束决定能不能交付。',
        checkpoints: ['写一个带断言的 testbench', '跑 Yosys/OpenROAD 小设计', '理解 setup/hold violation'],
        resources: [{ title: 'OpenROAD flow', kind: 'tool', provider: 'OpenROAD', url: 'https://theopenroadproject.org/', note: '开源后端流程，适合做教学和验证。' }],
      },
      {
        title: '阶段 3：系统级设计',
        goal: '围绕 cache、NoC、accelerator、memory hierarchy 做架构判断。',
        checkpoints: ['读懂一篇 accelerator 架构论文', '估算带宽/算力/片上存储瓶颈', '把论文指标转成表格'],
        resources: [{ title: 'SiliconScope 架构论文搜索', kind: 'paper', provider: 'Local database', url: localSearch('accelerator processor SoC'), note: '把数据库里的架构方向论文接到学习路线。' }],
      },
    ],
    projectIdeas: ['用 Verilog 写 tiny RISC-V 子集', '跑一次开源综合到 GDS 的 toy flow', '做 ISSCC AI accelerator 架构对比表'],
  },
  {
    id: 'verification-dft',
    family: 'digital-system',
    title: '数字验证 / DFT / 测试',
    subtitle: '验证是数字 IC 最大工程工作量之一，DFT 和量产测试决定芯片能否可靠交付。',
    level: '中等门槛',
    accent: '#0f766e',
    paperQuery: 'SystemVerilog UVM verification DFT scan ATPG BIST chip test',
    venues: ['DAC', 'ICCAD', 'DATE', 'ITC', 'VTS', 'TCAD'],
    foundation: ['数字逻辑', 'SystemVerilog', '脚本自动化', '形式验证', '故障模型', '测试向量'],
    prerequisites: [
      { title: '必须先会', note: '验证不是写更多 testbench，而是建立覆盖和约束思维。', items: ['SV 语法', 'assertion', 'coverage', 'random constraint', 'scoreboard'] },
      { title: '继续加深', note: 'DFT 需要理解制造缺陷和量产测试。', items: ['scan chain', 'ATPG', 'BIST', 'boundary scan', 'fault coverage'] },
    ],
    outcomes: ['能搭建模块级验证环境', '能读覆盖率报告', '能理解 scan/ATPG/BIST 基本流程'],
    stages: [
      {
        title: '阶段 1：从 testbench 到验证方法学',
        goal: '建立 stimulus、checker、coverage、scoreboard 的验证闭环。',
        checkpoints: ['给 FIFO 写 assertion', '写 constrained random test', '整理 coverage hole'],
        resources: [{ title: 'Verification Academy', kind: 'course', provider: 'Siemens EDA', url: 'https://verificationacademy.com/', note: 'SystemVerilog/UVM 工程资源入口。' }],
      },
      {
        title: '阶段 2：形式验证和 CDC',
        goal: '用数学约束补齐仿真无法覆盖的状态空间。',
        checkpoints: ['写 SVA property', '解释 deadlock/liveness', '检查一个 CDC crossing'],
        resources: [{ title: 'SiliconScope verification 搜索', kind: 'paper', provider: 'Local database', url: localSearch('formal verification CDC SystemVerilog UVM'), note: '查找验证和形式方法论文。' }],
      },
      {
        title: '阶段 3：DFT 和量产测试',
        goal: '理解芯片制造后如何被测试、筛选和诊断。',
        checkpoints: ['画 scan chain', '解释 stuck-at/transition fault', '比较 MBIST/LBIST'],
        resources: [{ title: 'International Test Conference', kind: 'guide', provider: 'ITC', url: 'https://www.itctestweek.org/', note: 'DFT/测试方向会议入口。' }],
      },
    ],
    projectIdeas: ['给 tiny CPU 做 UVM-lite 验证计划', '做 CDC bug checklist', '整理 scan/ATPG/BIST 学习卡片'],
  },
  {
    id: 'architecture-accelerator',
    family: 'digital-system',
    title: '处理器架构 / AI 加速器',
    subtitle: 'CPU、GPU、NPU、NoC、存储层次和编译映射，核心是算力、带宽、功耗和可编程性的平衡。',
    level: '中等门槛',
    accent: '#4f46e5',
    paperQuery: 'processor architecture AI accelerator NPU GPU NoC memory hierarchy',
    venues: ['ISCA', 'MICRO', 'HPCA', 'ASPLOS', 'ISSCC', 'JSSC'],
    foundation: ['计算机组成', '体系结构', '数字设计', '并行计算', '编译原理', '机器学习基础'],
    prerequisites: [
      { title: '必须先会', note: '架构不是堆模块，而是瓶颈分析。', items: ['流水线', 'cache', 'memory bandwidth', 'parallelism', 'roofline'] },
      { title: '继续加深', note: 'AI 加速器还要懂模型和数据流。', items: ['GEMM/conv', 'dataflow', 'sparsity', 'quantization', 'compiler mapping'] },
    ],
    outcomes: ['能读 accelerator 论文架构图', '能估算 TOPS/W 和带宽瓶颈', '能比较 systolic/dataflow/SIMD 取舍'],
    stages: [
      {
        title: '阶段 1：体系结构基本功',
        goal: '理解流水线、cache、乱序、并行和内存系统。',
        checkpoints: ['画五级流水线', '解释 cache miss penalty', '用 roofline 分析算子瓶颈'],
        resources: [{ title: 'Computer Architecture: A Quantitative Approach', kind: 'book', provider: 'Hennessy & Patterson', url: 'https://www.elsevier.com/books/computer-architecture/hennessy/978-0-12-811905-1', note: '体系结构经典。' }],
      },
      {
        title: '阶段 2：AI 加速器数据流',
        goal: '围绕矩阵乘、卷积、attention 和片上存储设计数据搬运。',
        checkpoints: ['比较 weight/output/row stationary', '算 SRAM reuse', '读一篇 TPU/Eyeriss 类论文'],
        resources: [{ title: 'SiliconScope accelerator 搜索', kind: 'paper', provider: 'Local database', url: localSearch('AI accelerator NPU dataflow compute-in-memory'), note: '本地数据库里的架构和加速器论文入口。' }],
      },
      {
        title: '阶段 3：软硬件协同',
        goal: '把 ISA、compiler、runtime 和硬件限制一起考虑。',
        checkpoints: ['写一个算子 mapping 表', '理解 TVM/MLIR 基本作用', '比较可编程性与效率'],
        resources: [{ title: 'MLIR project', kind: 'tool', provider: 'LLVM', url: 'https://mlir.llvm.org/', note: '编译器和硬件协同的重要基础设施。' }],
      },
    ],
    projectIdeas: ['做 NPU dataflow 对比表', '用 Python 写 roofline estimator', '整理 ISSCC AI accelerator 指标库'],
  },
  {
    id: 'fpga-reconfigurable',
    family: 'digital-system',
    title: 'FPGA / 可重构计算',
    subtitle: 'FPGA 是数字设计实战平台，也是一条研究路线：HLS、动态重构、低延迟加速、原型验证。',
    level: '入门友好',
    accent: '#0284c7',
    paperQuery: 'FPGA reconfigurable computing HLS overlay accelerator',
    venues: ['FPGA', 'FCCM', 'FPL', 'DAC', 'ICCAD', 'MICRO'],
    foundation: ['数字逻辑', 'Verilog/VHDL', '时序约束', 'C/C++', '并行计算', '接口协议'],
    prerequisites: [
      { title: '必须先会', note: 'FPGA 入门看得见波形和板子，反馈最快。', items: ['RTL', 'testbench', 'AXI/stream', 'timing constraint', 'BRAM/DSP'] },
      { title: '继续加深', note: '做研究会进入架构、HLS 和工具链。', items: ['HLS', 'overlay', 'partial reconfiguration', '低延迟 pipeline', 'host-device runtime'] },
    ],
    outcomes: ['能在 FPGA 上跑一个完整 demo', '能读 HLS/overlay 论文', '能用 FPGA 给 ASIC 做原型验证'],
    stages: [
      {
        title: '阶段 1：板级数字设计',
        goal: '从仿真走到板子，建立时钟、复位、IO 和 debug 经验。',
        checkpoints: ['LED/UART/SPI 小项目', 'ILA 抓波形', '修一个 timing violation'],
        resources: [{ title: 'HDLBits', kind: 'course', provider: 'HDLBits', url: 'https://hdlbits.01xz.net/wiki/Main_Page', note: 'Verilog 练习非常适合入门。' }],
      },
      {
        title: '阶段 2：HLS 和加速器',
        goal: '理解 C/C++ 到硬件的限制，把循环、存储和并行显式化。',
        checkpoints: ['写 HLS matrix multiply', '比较 pipeline/unroll/partition', '估算带宽瓶颈'],
        resources: [{ title: 'Xilinx Vitis HLS docs', kind: 'tool', provider: 'AMD/Xilinx', url: 'https://docs.amd.com/r/en-US/ug1399-vitis-hls', note: 'HLS 实战文档入口。' }],
      },
      {
        title: '阶段 3：可重构系统研究',
        goal: '关注 overlay、dynamic reconfiguration 和低延迟系统。',
        checkpoints: ['读一篇 FPGA overlay 论文', '画 host-FPGA 数据流', '做低延迟 pipeline 指标表'],
        resources: [{ title: 'SiliconScope FPGA 搜索', kind: 'paper', provider: 'Local database', url: localSearch('FPGA HLS reconfigurable accelerator'), note: '找 FPGA 和可重构计算论文。' }],
      },
    ],
    projectIdeas: ['做 tiny CNN HLS 加速器', '用 FPGA 验证一个 RTL IP', '整理 FPGA/HLS 论文工具链'],
  },
  {
    id: 'devices-process',
    family: 'device-manufacturing',
    title: '器件、工艺与 CMOS 技术',
    subtitle: '从半导体物理、器件、工艺到 PDK，是理解先进节点、可靠性和电路极限的根。',
    level: '研究导向',
    accent: '#059669',
    paperQuery: 'semiconductor device CMOS process integration FinFET GAA',
    venues: ['IEDM', 'VLSI', 'IRPS', 'EDL', 'TED', 'TCAD'],
    foundation: ['大学物理', '量子力学', '固体物理', '半导体物理', '半导体器件', '工艺流程'],
    prerequisites: [
      { title: '必须先会', note: '器件路线对物理耐心要求高。', items: ['能带', 'PN 结', 'MOS 电容', 'MOSFET I-V', '短沟道效应'] },
      { title: '继续加深', note: '先进节点还要跟材料、工艺和可靠性一起看。', items: ['FinFET/GAA', 'BEOL/FEOL', 'TCAD', 'BTI/HCI/EM', 'PDK rule'] },
    ],
    outcomes: ['能读懂器件论文关键图', '能解释工艺缩放为什么变难', '能把 PDK 约束和电路设计联系起来'],
    stages: [
      {
        title: '阶段 1：物理和器件',
        goal: '从能带、PN 结、MOS 电容一路走到 MOSFET 工作机理。',
        checkpoints: ['画 MOS C-V 曲线', '解释 short-channel effect', '知道 FinFET/GAA 为什么出现'],
        resources: [{ title: 'Semiconductor Device Fundamentals', kind: 'book', provider: 'R. F. Pierret', url: 'https://www.pearson.com/en-us/subject-catalog/p/semiconductor-device-fundamentals/P200000003176', note: '器件入门经典。' }],
      },
      {
        title: '阶段 2：工艺、PDK 和可靠性',
        goal: '知道版图规则背后的工艺约束，以及可靠性为什么会限制电路。',
        checkpoints: ['读 DRC/LVS rule 摘要', '理解 BEOL/FEOL 差异', '整理 BTI/HCI/EM 关键词'],
        resources: [{ title: 'SiliconScope 器件工艺论文搜索', kind: 'paper', provider: 'Local database', url: localSearch('FinFET GAA process integration CMOS'), note: '看 IEDM/VLSI 的方向变化。' }],
      },
      {
        title: '阶段 3：模型与设计协同',
        goal: '把器件模型、工艺波动和电路指标连接起来。',
        checkpoints: ['比较 BSIM 模型参数', '解释 mismatch 来源', '整理 PVT corner 对电路影响'],
        resources: [{ title: 'BSIM models', kind: 'guide', provider: 'UC Berkeley', url: 'https://bsim.berkeley.edu/', note: '器件模型和电路仿真的接口。' }],
      },
    ],
    projectIdeas: ['做 FinFET/GAA 论文时间线', '整理可靠性关键词和对应失效机理', '做 PDK rule 到 layout 约束映射表'],
  },
  {
    id: 'power-devices',
    family: 'device-manufacturing',
    title: '功率半导体 / 宽禁带器件',
    subtitle: 'SiC、GaN、功率 MOSFET、IGBT 和高压集成，连接器件、工艺、电源和系统应用。',
    level: '研究导向',
    accent: '#ca8a04',
    paperQuery: 'power semiconductor SiC GaN IGBT power MOSFET wide bandgap',
    venues: ['IEDM', 'ISPSD', 'VLSI', 'TED', 'EDL', 'TPEL'],
    foundation: ['半导体器件', '材料物理', '高压器件', '热设计', '可靠性', '功率电子'],
    prerequisites: [
      { title: '必须先会', note: '功率器件的核心是高压、大电流、热和可靠性。', items: ['击穿', '导通电阻', '迁移率', '热阻', '雪崩与短路'] },
      { title: '继续加深', note: '宽禁带方向要补材料和封装。', items: ['SiC/GaN 材料', '栅可靠性', '封装寄生', '驱动电路', '系统效率'] },
    ],
    outcomes: ['能比较 Si/SiC/GaN 适用场景', '能读懂功率器件 trade-off', '能把器件和电源系统联系起来'],
    stages: [
      {
        title: '阶段 1：高压器件基础',
        goal: '理解耐压、导通电阻和面积之间的基本权衡。',
        checkpoints: ['解释 R_on vs BV trade-off', '画功率 MOSFET 结构', '整理 IGBT/MOSFET/GaN HEMT 差异'],
        resources: [{ title: 'ISPSD conference', kind: 'guide', provider: 'IEEE / ISPSD', url: 'https://www.ispsd2025.com/', note: '功率半导体器件核心会议入口。' }],
      },
      {
        title: '阶段 2：宽禁带与可靠性',
        goal: '理解 SiC/GaN 为什么重要，也知道它们的问题在哪里。',
        checkpoints: ['比较 SiC 与 GaN 应用边界', '解释 threshold instability', '整理栅驱动需求'],
        resources: [{ title: 'SiliconScope power device 搜索', kind: 'paper', provider: 'Local database', url: localSearch('SiC GaN power semiconductor wide bandgap'), note: '查宽禁带器件和功率半导体论文。' }],
      },
      {
        title: '阶段 3：器件-封装-系统',
        goal: '把器件参数转成系统效率、热和 EMI 约束。',
        checkpoints: ['估算开关损耗', '画功率模块寄生路径', '比较 discrete 与 module'],
        resources: [{ title: 'IEEE TPEL', kind: 'guide', provider: 'IEEE', url: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=63', note: '功率电子系统和应用补充入口。' }],
      },
    ],
    projectIdeas: ['做 SiC/GaN 应用地图', '整理 ISPSD 近年主题变化', '比较功率器件和 PMIC 路线差异'],
  },
  {
    id: 'advanced-packaging',
    family: 'device-manufacturing',
    title: '先进封装 / Chiplet / 异构集成',
    subtitle: '2.5D/3D、HBM、interposer、UCIe、thermal 和 signal integrity，让系统不再只靠单颗 SoC。',
    level: '中等门槛',
    accent: '#9333ea',
    paperQuery: 'advanced packaging chiplet 2.5D 3D integration HBM interposer UCIe',
    venues: ['ECTC', 'ISSCC', 'VLSI', 'IEDM', 'DAC', 'JSSC'],
    foundation: ['数字系统', '封装工艺', '信号完整性', '热设计', '高速接口', '系统架构'],
    prerequisites: [
      { title: '必须先会', note: '先进封装是系统、工艺和高速互连的交叉。', items: ['SoC 基础', 'I/O 接口', '封装类型', '热阻', 'SI/PI'] },
      { title: '继续加深', note: 'Chiplet 需要协议、架构和制造生态共同理解。', items: ['UCIe', 'interposer', 'HBM', 'die-to-die link', 'yield/cost model'] },
    ],
    outcomes: ['能解释 2.5D/3D/chiplet 差异', '能读懂 die-to-die 互连指标', '能判断先进封装对架构的影响'],
    stages: [
      {
        title: '阶段 1：封装基本概念',
        goal: '建立 wire bond、flip-chip、fan-out、interposer、3D stacking 的地图。',
        checkpoints: ['画常见封装剖面', '解释 bump/pad/interposer', '比较 fan-out 和 2.5D'],
        resources: [{ title: 'Heterogeneous Integration Roadmap', kind: 'guide', provider: 'HIR', url: 'https://eps.ieee.org/technology/heterogeneous-integration-roadmap.html', note: '先进封装和异构集成的大图景。' }],
      },
      {
        title: '阶段 2：高速互连和内存墙',
        goal: '理解 HBM、die-to-die PHY 和封装布线如何影响系统性能。',
        checkpoints: ['估算 HBM 带宽', '比较 parallel 与 serial die-to-die', '读一篇 UCIe/BoW/AIB 资料'],
        resources: [{ title: 'UCIe specification', kind: 'guide', provider: 'UCIe Consortium', url: 'https://www.uciexpress.org/specification', note: 'Chiplet 生态重要开放规范。' }],
      },
      {
        title: '阶段 3：系统级权衡',
        goal: '把成本、良率、热、功耗和架构拆分一起考虑。',
        checkpoints: ['做 chiplet partition 表', '解释 known-good-die', '画 thermal bottleneck'],
        resources: [{ title: 'SiliconScope chiplet 搜索', kind: 'paper', provider: 'Local database', url: localSearch('chiplet 2.5D HBM interposer die-to-die'), note: '查看芯粒、封装和互连论文。' }],
      },
    ],
    projectIdeas: ['画主流 AI GPU 封装拓扑', '整理 UCIe/BoW/AIB 对比', '做先进封装术语卡片'],
  },
  {
    id: 'eda-tools',
    family: 'cad-security',
    title: 'EDA 与设计自动化',
    subtitle: '服务所有 IC 方向的底座：仿真、综合、布局布线、版图生成、验证和 AI for EDA。',
    level: '中等门槛',
    accent: '#7c3aed',
    paperQuery: 'EDA OR placement OR routing OR verification OR analog layout automation',
    venues: ['DAC', 'ICCAD', 'DATE', 'TCAD', 'TCAS', 'ASP-DAC'],
    foundation: ['数据结构与算法', '图算法', '优化', 'C++/Python', '编译原理', 'VLSI CAD'],
    prerequisites: [
      { title: '必须先会', note: 'EDA 是 CS 算法和 IC 约束的结合。', items: ['图算法', '搜索/优化', 'C++/Python', '数字设计流程', '文件格式'] },
      { title: '继续加深', note: '不同子方向差异很大。', items: ['逻辑综合', 'placement/routing', 'STA', 'formal', 'analog layout automation'] },
    ],
    outcomes: ['能读 VLSI CAD 论文问题建模', '能跑开源 EDA flow', '能把算法接到真实 netlist/layout/timing report'],
    stages: [
      {
        title: '阶段 1：算法底座',
        goal: '把图、搜索、动态规划、线性/整数规划和启发式算法补扎实。',
        checkpoints: ['实现 topological sort', '理解 min-cut 和 shortest path', '能读懂 simulated annealing'],
        resources: [{ title: 'Algorithms, Part I/II', kind: 'course', provider: 'Princeton', url: 'https://algs4.cs.princeton.edu/home/', note: 'EDA 算法前置很稳。' }],
      },
      {
        title: '阶段 2：VLSI CAD 主线',
        goal: '理解 synthesis、placement、routing、STA 的问题建模。',
        checkpoints: ['读一个 placement benchmark', '解释 timing-driven placement', '比较 SAT/SMT 在验证里的作用'],
        resources: [{ title: 'VLSI CAD: Logic to Layout', kind: 'course', provider: 'UIUC / Coursera', url: 'https://www.coursera.org/learn/vlsi-cad-logic', note: 'ic-guide 也把它放在 EDA 路线核心位置。' }],
      },
      {
        title: '阶段 3：连接真实设计流',
        goal: '把算法接入真实 netlist、layout、timing report，而不是只跑 toy example。',
        checkpoints: ['解析 DEF/LEF 或 Verilog netlist', '跑一次 OpenROAD', '做一个 AI 辅助版图/分类小工具'],
        resources: [{ title: 'SiliconScope EDA 论文搜索', kind: 'paper', provider: 'Local database', url: localSearch('EDA placement routing verification'), note: '后续可以用本地论文库生成 reading list。' }],
      },
    ],
    projectIdeas: ['实现 tiny global placer', '做论文标题到 EDA 子方向的分类器', '解析 timing report 并画 dashboard'],
  },
  {
    id: 'hardware-security',
    family: 'cad-security',
    title: '硬件安全 / 可信计算',
    subtitle: '侧信道、PUF、Trojan、TEE、加密加速和供应链可信，连接芯片架构、电路和安全攻防。',
    level: '研究导向',
    accent: '#be123c',
    paperQuery: 'hardware security side-channel PUF Trojan trusted execution cryptographic accelerator',
    venues: ['HOST', 'CHES', 'DAC', 'ICCAD', 'USENIX Security', 'ISSCC'],
    foundation: ['数字系统', '密码学基础', '信号采集', '统计分析', '嵌入式系统', 'EDA/测试'],
    prerequisites: [
      { title: '必须先会', note: '硬件安全需要懂攻击面，也懂硬件实现。', items: ['AES/RSA/ECC 基础', '微架构', '功耗/时序侧信道', 'fault injection', 'secure boot'] },
      { title: '继续加深', note: '从算法安全到芯片供应链安全。', items: ['PUF', 'Trojan detection', 'TEE', 'formal security', 'supply-chain trust'] },
    ],
    outcomes: ['能理解侧信道攻击和防护', '能读安全芯片/加密加速器论文', '能把安全问题映射到电路/架构/EDA 层'],
    stages: [
      {
        title: '阶段 1：安全基础和攻击模型',
        goal: '建立 threat model，知道攻击者能观察什么、控制什么。',
        checkpoints: ['解释 timing/power side-channel', '画 secure boot chain', '比较 software/hardware root of trust'],
        resources: [{ title: 'CHES conference', kind: 'guide', provider: 'IACR', url: 'https://ches.iacr.org/', note: '密码硬件和嵌入式安全核心会议。' }],
      },
      {
        title: '阶段 2：侧信道与防护',
        goal: '把功耗、电磁、时序泄漏与电路实现联系起来。',
        checkpoints: ['做 CPA 攻击流程图', '解释 masking/hiding', '比较 DPA/EMA/FI'],
        resources: [{ title: 'ChipWhisperer', kind: 'tool', provider: 'NewAE', url: 'https://chipwhisperer.readthedocs.io/', note: '侧信道学习和实验平台。' }],
      },
      {
        title: '阶段 3：可信硬件和供应链',
        goal: '关注 PUF、Trojan、TEE、形式化和设计流程安全。',
        checkpoints: ['解释 PUF enrollment', '整理 Trojan detection 方法', '读一篇 HOST 论文'],
        resources: [{ title: 'SiliconScope hardware security 搜索', kind: 'paper', provider: 'Local database', url: localSearch('hardware security PUF Trojan side-channel'), note: '连接本地论文库。' }],
      },
    ],
    projectIdeas: ['做侧信道术语卡', '整理 PUF/Trojan/TEE 论文图谱', '用公开 trace 做 CPA 小实验'],
  },
  {
    id: 'memory-cim',
    family: 'frontier',
    title: '存储器 / 存算一体 / 近存计算',
    subtitle: 'SRAM、DRAM、Flash、ReRAM、MRAM、CIM 和 PIM，核心是突破数据搬运和能效瓶颈。',
    level: '研究导向',
    accent: '#9333ea',
    paperQuery: 'SRAM DRAM ReRAM MRAM compute-in-memory processing-in-memory',
    venues: ['ISSCC', 'JSSC', 'IEDM', 'VLSI', 'DAC', 'ISCA'],
    foundation: ['数字电路', '存储器电路', '器件物理', 'AI 算子', '数据转换器', '架构评估'],
    prerequisites: [
      { title: '必须先会', note: 'CIM 是电路、器件和架构交叉。', items: ['SRAM bitcell', 'sense amplifier', 'memory hierarchy', 'MAC/GEMM', 'ADC/DAC 基础'] },
      { title: '继续加深', note: '不同存储介质决定不同误差和系统约束。', items: ['ReRAM/MRAM/FeFET', 'analog CIM', 'bit-serial compute', 'calibration', 'mapping'] },
    ],
    outcomes: ['能区分 memory、near-memory、in-memory', '能读懂 CIM macro 指标', '能判断精度/能效/面积 trade-off'],
    stages: [
      {
        title: '阶段 1：存储器基本单元',
        goal: '理解 SRAM/DRAM/Flash 等基本读写和 sense 机制。',
        checkpoints: ['画 6T SRAM', '解释 read disturb/write margin', '比较 SRAM/DRAM/Flash'],
        resources: [{ title: 'SiliconScope memory 搜索', kind: 'paper', provider: 'Local database', url: localSearch('SRAM DRAM memory macro JSSC ISSCC'), note: '从 memory macro 论文入门。' }],
      },
      {
        title: '阶段 2：存算一体电路',
        goal: '理解 bitline compute、analog MAC、ADC overhead 和误差来源。',
        checkpoints: ['画 SRAM-CIM bitline MAC', '估算 ADC 能耗占比', '比较 analog/digital CIM'],
        resources: [{ title: 'SiliconScope CIM 搜索', kind: 'paper', provider: 'Local database', url: localSearch('compute-in-memory ReRAM SRAM-CIM MAC'), note: '查 ISSCC/JSSC 的 CIM 代表论文。' }],
      },
      {
        title: '阶段 3：架构映射和系统评估',
        goal: '把 macro 指标接到模型精度、吞吐和带宽上。',
        checkpoints: ['映射一层 conv/GEMM', '比较 TOPS/W 是否公平', '整理精度损失来源'],
        resources: [{ title: 'MLPerf inference', kind: 'guide', provider: 'MLCommons', url: 'https://mlcommons.org/benchmarks/inference-datacenter/', note: '系统级性能评估参考。' }],
      },
    ],
    projectIdeas: ['整理 SRAM-CIM vs ReRAM-CIM 对比', '做 CIM 论文指标数据库', '估算 ADC overhead 对 TOPS/W 的影响'],
  },
  {
    id: 'silicon-photonics',
    family: 'frontier',
    title: '硅光 / 光电子集成',
    subtitle: '调制器、探测器、激光耦合、光互连和光计算，面向数据中心互连和新型计算媒介。',
    level: '研究导向',
    accent: '#0891b2',
    paperQuery: 'silicon photonics optical interconnect photonic integrated circuit modulator',
    venues: ['OFC', 'CLEO', 'ISSCC', 'JLT', 'Nature Photonics', 'VLSI'],
    foundation: ['光学', '电磁场', '半导体器件', '模拟/RF', '高速接口', '封装耦合'],
    prerequisites: [
      { title: '必须先会', note: '硅光需要把光学和电子接口接起来。', items: ['波导', '调制器', '光探测器', 'TIA', 'SerDes', '封装耦合'] },
      { title: '继续加深', note: '系统瓶颈常在光电协同和封装。', items: ['co-packaged optics', 'laser integration', 'thermal tuning', 'WDM', 'photonic compute'] },
    ],
    outcomes: ['能理解 optical link budget', '能读光电收发前端论文', '能看懂硅光和封装协同问题'],
    stages: [
      {
        title: '阶段 1：光学和器件',
        goal: '理解光在波导中传播、调制和探测的基本机制。',
        checkpoints: ['解释 ring modulator', '画 photodiode + TIA', '理解 insertion loss'],
        resources: [{ title: 'Silicon Photonics Design', kind: 'guide', provider: 'University / foundry ecosystem', url: 'https://www.lumerical.com/learn/intro-to-photonics/', note: '硅光设计和仿真的入门入口。' }],
      },
      {
        title: '阶段 2：高速光电接口',
        goal: '把光器件接到 TIA、driver、CDR、SerDes 系统。',
        checkpoints: ['画 optical receiver chain', '解释 bandwidth/sensitivity', '读一篇 optical interconnect 论文'],
        resources: [{ title: 'SiliconScope silicon photonics 搜索', kind: 'paper', provider: 'Local database', url: localSearch('silicon photonics optical interconnect TIA modulator'), note: '查硅光和光互连论文。' }],
      },
      {
        title: '阶段 3：封装和系统',
        goal: '理解 CPO、WDM、热调谐和系统可靠性。',
        checkpoints: ['比较 pluggable optics 与 CPO', '整理 WDM link budget', '画 laser coupling 方案'],
        resources: [{ title: 'OFC conference', kind: 'guide', provider: 'Optica / IEEE', url: 'https://www.ofcconference.org/', note: '光通信和光互连核心会议。' }],
      },
    ],
    projectIdeas: ['做 optical interconnect 术语卡', '整理 CPO 论文路线', '比较 TIA 与 SerDes 指标'],
  },
  {
    id: 'quantum-neuromorphic',
    family: 'frontier',
    title: '量子芯片 / 类脑芯片',
    subtitle: '量子控制、低温 CMOS、SNN、神经形态计算，是更前沿但路径更分叉的方向。',
    level: '研究导向',
    accent: '#64748b',
    paperQuery: 'quantum chip cryogenic CMOS neuromorphic SNN spiking neural network',
    venues: ['ISSCC', 'JSSC', 'IEDM', 'Nature Electronics', 'ISCA', 'AICAS'],
    foundation: ['量子力学', '低温电子学', '模拟/RF', '数字架构', '神经网络', '器件物理'],
    prerequisites: [
      { title: '必须先会', note: '这类方向分叉很大，先选量子或类脑主线。', items: ['量子比特基础或 SNN 基础', '低噪声读出', '时钟/脉冲系统', '器件非理想性', '系统建模'] },
      { title: '继续加深', note: '需要跨学科论文阅读，不建议作为零基础第一站。', items: ['cryogenic CMOS', 'qubit control', 'memristor', 'event-driven architecture', 'learning rule'] },
    ],
    outcomes: ['能区分量子控制芯片和量子器件', '能理解 SNN/类脑芯片基本指标', '能判断哪些内容仍处研究探索期'],
    stages: [
      {
        title: '阶段 1：选主线',
        goal: '先决定量子控制、低温 CMOS、SNN 架构或新型器件，避免同时铺太宽。',
        checkpoints: ['画 qubit control/readout chain 或 SNN dataflow', '列出必须补的物理/算法概念', '读 3 篇综述'],
        resources: [{ title: 'SiliconScope frontier 搜索', kind: 'paper', provider: 'Local database', url: localSearch('cryogenic CMOS neuromorphic SNN quantum chip'), note: '先用本地库摸清论文分布。' }],
      },
      {
        title: '阶段 2：接口电路和系统',
        goal: '理解低温、噪声、能耗、脉冲和可扩展性约束。',
        checkpoints: ['解释 cryo-CMOS 难点', '比较 rate coding/temporal coding', '整理读出链指标'],
        resources: [{ title: 'Nature Electronics', kind: 'guide', provider: 'Nature Portfolio', url: 'https://www.nature.com/natelectron/', note: '前沿芯片方向常见发表出口之一。' }],
      },
      {
        title: '阶段 3：从论文到可验证项目',
        goal: '做一个小仿真或小综述，而不是急着“流片”。',
        checkpoints: ['复现 SNN 小网络', '做量子控制链路图', '整理新型器件优缺点'],
        resources: [{ title: 'Brian2 SNN simulator', kind: 'tool', provider: 'Brian project', url: 'https://brian2.readthedocs.io/', note: '类脑/SNN 入门仿真工具之一。' }],
      },
    ],
    projectIdeas: ['做 cryo-CMOS 论文阅读清单', '复现一个小 SNN', '整理量子控制芯片 block diagram'],
  },
]
