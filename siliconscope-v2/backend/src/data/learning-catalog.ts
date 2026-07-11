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

export const learningRoadmaps: LearningRoadmapSeed[] = [
  {
    slug: 'analog-mixed-signal',
    title: '模拟与混合信号 IC',
    shortTitle: '模拟与混合信号 IC',
    domain: 'Analog & Mixed-Signal',
    level: 'advanced',
    description: 'ADC、DAC、PLL、SerDes、AFE、PMIC，是连接真实物理世界和数字 SoC 的入口。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          '小信号模型',
          '反馈与稳定性',
          '噪声与失配',
          '采样与量化',
          'SPICE 仿真',
          '版图匹配',
          '寄生提取',
          '数据转换器 FoM',
          '时钟抖动',
          '实验测试'
        ],
    stages:     [
          {
            id: 'analog-mixed-signal-0',
            title: '阶段 1：建立电路直觉',
            goal: '读懂小信号模型、反馈、噪声、失配和基本放大器结构。',
            modules: [
              {
                id: 'analog-mixed-signal-m0',
                title: '阶段 1：建立电路直觉',
                purpose: '读懂小信号模型、反馈、噪声、失配和基本放大器结构。',
                lessonPlaceholders: [
                  '手推差分对增益和输入范围',
                  '解释 Miller 补偿为什么稳定运放',
                  '用 SPICE 验证手算结论'
                ],
                relatedKeywords: [
                  '手推差分对增益和输入范围',
                  '解释 Miller 补偿为什么稳定运放',
                  '用 SPICE 验证手算结论'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '手推差分对增益和输入范围',
              '解释 Miller 补偿为什么稳定运放',
              '用 SPICE 验证手算结论'
            ],
            resources: [
              {
                title: 'UCLA Electronics / Razavi lectures',
                kind: 'course',
                provider: 'UCLA / B. Razavi',
                url: 'https://www.seas.ucla.edu/brweb/teaching.html',
                note: '模拟电路入门经典，适合反复看。'
              },
              {
                title: 'Design of Analog CMOS Integrated Circuits',
                kind: 'book',
                provider: 'B. Razavi',
                url: 'https://www.mheducation.com/highered/product/design-analog-cmos-integrated-circuits-razavi/M9780072524932.html',
                note: '模拟 IC 主线教材。'
              }
            ]
          },
          {
            id: 'analog-mixed-signal-1',
            title: '阶段 2：进入核心模块',
            goal: '围绕 ADC/DAC/PLL/SerDes/PMIC 选择一个方向做深。',
            modules: [
              {
                id: 'analog-mixed-signal-m1',
                title: '阶段 2：进入核心模块',
                purpose: '围绕 ADC/DAC/PLL/SerDes/PMIC 选择一个方向做深。',
                lessonPlaceholders: [
                  '复现一个 SAR ADC behavioral model',
                  '读 10 篇 ISSCC/JSSC 数据转换器论文',
                  '整理 FoM、SNDR、ENOB、jitter 指标表'
                ],
                relatedKeywords: [
                  '复现一个 SAR ADC behavioral model',
                  '读 10 篇 ISSCC/JSSC 数据转换器论文',
                  '整理 FoM、SNDR、ENOB、jitter 指标表'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '复现一个 SAR ADC behavioral model',
              '读 10 篇 ISSCC/JSSC 数据转换器论文',
              '整理 FoM、SNDR、ENOB、jitter 指标表'
            ],
            resources: [
              {
                title: 'Murmann ADC Performance Survey',
                kind: 'guide',
                provider: 'B. Murmann',
                url: 'https://github.com/bmurmann/ADC-survey',
                note: 'ADC 指标和论文入口，非常适合建立 benchmark 感。'
              },
              {
                title: 'SiliconScope 混合信号论文搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'ADC',
                note: '从本地论文库切入代表论文。'
              }
            ]
          },
          {
            id: 'analog-mixed-signal-2',
            title: '阶段 3：版图、寄生和测试',
            goal: '理解为什么仿真不等于硅片，能做 post-layout 和基本测试规划。',
            modules: [
              {
                id: 'analog-mixed-signal-m2',
                title: '阶段 3：版图、寄生和测试',
                purpose: '理解为什么仿真不等于硅片，能做 post-layout 和基本测试规划。',
                lessonPlaceholders: [
                  '画一个匹配电容阵列 layout',
                  '跑 PEX 后比较前后仿真',
                  '写出测试板/仪器需求清单'
                ],
                relatedKeywords: [
                  '画一个匹配电容阵列 layout',
                  '跑 PEX 后比较前后仿真',
                  '写出测试板/仪器需求清单'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '画一个匹配电容阵列 layout',
              '跑 PEX 后比较前后仿真',
              '写出测试板/仪器需求清单'
            ],
            resources: [
              {
                title: 'Cadence custom IC flow',
                kind: 'tool',
                provider: 'Cadence',
                url: 'https://www.cadence.com/en_US/home/tools/custom-ic-analog-rf-design.html',
                note: '工业界模拟/RF 主力工具链。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Analog & Mixed-Signal',
          'RF/mmWave & Wireline'
        ],
    relatedVenues:     [
          'ISSCC',
          'JSSC',
          'VLSI',
          'CICC',
          'A-SSCC',
          'ESSERC'
        ],
    relatedSearchQueries:     [
          'ADC',
          'DAC',
          'PLL',
          'SerDes',
          'mixed-signal',
          'PMIC'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'circuit',
    accent: '#dc2626',
    subtitle: 'ADC、DAC、PLL、SerDes、AFE、PMIC，是连接真实物理世界和数字 SoC 的入口。',
    paperQuery: 'ADC OR DAC OR PLL OR SerDes OR mixed-signal OR PMIC',
    venues:     [
          'ISSCC',
          'JSSC',
          'VLSI',
          'CICC',
          'A-SSCC',
          'ESSERC'
        ],
    foundation:     [
          '电路分析',
          '模拟电子线路',
          '信号与系统',
          '半导体器件',
          '概率统计',
          'Cadence Virtuoso'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '没有这些会看不懂指标和波形。',
            items: [
              '小信号模型',
              '反馈与稳定性',
              '噪声与失配',
              '采样与量化',
              'SPICE 仿真'
            ]
          },
          {
            title: '继续加深',
            note: '读论文和流片时逐渐补。',
            items: [
              '版图匹配',
              '寄生提取',
              '数据转换器 FoM',
              '时钟抖动',
              '实验测试'
            ]
          }
        ],
    outcomes:     [
          '能读懂 ADC/PLL/SerDes/PMIC 论文指标',
          '能复现模块级仿真',
          '能把架构、版图、测试连成闭环'
        ],
    projectIdeas:     [
          '用 Verilog-A 建一个 SAR ADC 行为模型',
          '做 PLL phase-noise 论文指标表',
          '整理近十年 ISSCC/JSSC ADC 架构变化'
        ],
  },
  {
    slug: 'rf-mmwave',
    title: 'RF / 毫米波 IC',
    shortTitle: 'RF / 毫米波 IC',
    domain: 'RF/mmWave & Wireline',
    level: 'advanced',
    description: 'LNA、PA、Mixer、VCO、PLL、相控阵和毫米波收发机，核心是频率、噪声、线性和效率的交易。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          '阻抗匹配',
          'S 参数',
          '噪声系数',
          '非线性与线性度',
          '频谱与调制',
          '相控阵',
          'PA 效率',
          'PLL 相噪',
          'EM/封装寄生',
          'VNA/频谱仪测试'
        ],
    stages:     [
          {
            id: 'rf-mmwave-0',
            title: '阶段 1：从高频现象重学电路',
            goal: '接受“走线就是电路”的事实，掌握 S 参数、阻抗匹配和噪声系数。',
            modules: [
              {
                id: 'rf-mmwave-m0',
                title: '阶段 1：从高频现象重学电路',
                purpose: '接受“走线就是电路”的事实，掌握 S 参数、阻抗匹配和噪声系数。',
                lessonPlaceholders: [
                  '会读 S11/S21',
                  '解释 LNA 噪声匹配和功率匹配差异',
                  '用 Smith Chart 做一个匹配网络'
                ],
                relatedKeywords: [
                  '会读 S11/S21',
                  '解释 LNA 噪声匹配和功率匹配差异',
                  '用 Smith Chart 做一个匹配网络'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '会读 S11/S21',
              '解释 LNA 噪声匹配和功率匹配差异',
              '用 Smith Chart 做一个匹配网络'
            ],
            resources: [
              {
                title: 'RF Microelectronics',
                kind: 'book',
                provider: 'B. Razavi',
                url: 'https://www.pearson.com/en-us/subject-catalog/p/rf-microelectronics/P200000003188',
                note: 'RFIC 入门主线。'
              }
            ]
          },
          {
            id: 'rf-mmwave-1',
            title: '阶段 2：收发机链路和模块指标',
            goal: '把 LNA、Mixer、VCO、PA 放回系统链路预算里理解。',
            modules: [
              {
                id: 'rf-mmwave-m1',
                title: '阶段 2：收发机链路和模块指标',
                purpose: '把 LNA、Mixer、VCO、PA 放回系统链路预算里理解。',
                lessonPlaceholders: [
                  '画 receiver cascade noise budget',
                  '比较 PA PAE、linearization 和 back-off',
                  '读 5 篇 phased-array 论文'
                ],
                relatedKeywords: [
                  '画 receiver cascade noise budget',
                  '比较 PA PAE、linearization 和 back-off',
                  '读 5 篇 phased-array 论文'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '画 receiver cascade noise budget',
              '比较 PA PAE、linearization 和 back-off',
              '读 5 篇 phased-array 论文'
            ],
            resources: [
              {
                title: 'SiliconScope RF/mmWave 论文搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'mmWave',
                note: '直接看 JSSC/ISSCC/RFIC 里的最新架构。'
              }
            ]
          },
          {
            id: 'rf-mmwave-2',
            title: '阶段 3：版图、封装和测量',
            goal: '理解 EM、封装、探针台、VNA/频谱仪如何影响真实结果。',
            modules: [
              {
                id: 'rf-mmwave-m2',
                title: '阶段 3：版图、封装和测量',
                purpose: '理解 EM、封装、探针台、VNA/频谱仪如何影响真实结果。',
                lessonPlaceholders: [
                  '跑一个 inductor EM extraction',
                  '列出毫米波测试仪器链',
                  '解释 de-embedding 的意义'
                ],
                relatedKeywords: [
                  '跑一个 inductor EM extraction',
                  '列出毫米波测试仪器链',
                  '解释 de-embedding 的意义'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '跑一个 inductor EM extraction',
              '列出毫米波测试仪器链',
              '解释 de-embedding 的意义'
            ],
            resources: [
              {
                title: 'Keysight RF measurement basics',
                kind: 'guide',
                provider: 'Keysight',
                url: 'https://www.keysight.com/us/en/assets/7018-06840/application-notes/5952-0292.pdf',
                note: '测试视角补齐 RFIC 工程闭环。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Analog & Mixed-Signal',
          'RF/mmWave & Wireline'
        ],
    relatedVenues:     [
          'ISSCC',
          'JSSC',
          'RFIC',
          'IMS',
          'T-MTT',
          'ESSERC'
        ],
    relatedSearchQueries:     [
          'RFIC',
          'mmWave',
          'phased-array',
          'power amplifier',
          'LNA',
          'mixer'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'circuit',
    accent: '#1d4ed8',
    subtitle: 'LNA、PA、Mixer、VCO、PLL、相控阵和毫米波收发机，核心是频率、噪声、线性和效率的交易。',
    paperQuery: 'RFIC OR mmWave OR phased-array OR power amplifier OR LNA OR mixer',
    venues:     [
          'ISSCC',
          'JSSC',
          'RFIC',
          'IMS',
          'T-MTT',
          'ESSERC'
        ],
    foundation:     [
          '模拟电路',
          '电磁场与微波',
          '信号处理',
          'S 参数',
          'Smith Chart',
          'EM 仿真'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: 'RF 的第一道门槛是高频电路语言。',
            items: [
              '阻抗匹配',
              'S 参数',
              '噪声系数',
              '非线性与线性度',
              '频谱与调制'
            ]
          },
          {
            title: '继续加深',
            note: '毫米波和相控阵需要系统、封装、测试一起看。',
            items: [
              '相控阵',
              'PA 效率',
              'PLL 相噪',
              'EM/封装寄生',
              'VNA/频谱仪测试'
            ]
          }
        ],
    outcomes:     [
          '能读懂收发机链路预算',
          '能比较 LNA/PA/PLL 指标',
          '能理解毫米波版图和测试难点'
        ],
    projectIdeas:     [
          '做 28GHz phased-array 论文表',
          '整理 PA 效率/线性技术树',
          '复现阻抗匹配小例子'
        ],
  },
  {
    slug: 'power-management',
    title: '电源管理 IC / PMIC',
    shortTitle: '电源管理 IC / PMIC',
    domain: 'Power Management',
    level: 'intermediate',
    description: 'LDO、Buck/Boost、Switched-Cap、Charge Pump、BMS，是所有 SoC 和移动设备的供电基础。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          '运放与基准',
          '反馈补偿',
          '电感/电容能量',
          '开关损耗',
          '负载瞬态',
          '多相 Buck',
          'SC converter',
          '数字控制',
          '封装寄生',
          '电池管理'
        ],
    stages:     [
          {
            id: 'power-management-0',
            title: '阶段 1：模拟基础和电源基本单元',
            goal: '理解 bandgap、error amplifier、pass device、power switch 等基础块。',
            modules: [
              {
                id: 'power-management-m0',
                title: '阶段 1：模拟基础和电源基本单元',
                purpose: '理解 bandgap、error amplifier、pass device、power switch 等基础块。',
                lessonPlaceholders: [
                  '画出 LDO 小信号环路',
                  '解释 dropout 和 PSRR',
                  '比较 Buck/Boost/Buck-Boost'
                ],
                relatedKeywords: [
                  '画出 LDO 小信号环路',
                  '解释 dropout 和 PSRR',
                  '比较 Buck/Boost/Buck-Boost'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '画出 LDO 小信号环路',
              '解释 dropout 和 PSRR',
              '比较 Buck/Boost/Buck-Boost'
            ],
            resources: [
              {
                title: 'Power Management Integrated Circuits',
                kind: 'book',
                provider: 'Springer / Analog IC texts',
                url: 'https://link.springer.com/book/10.1007/978-3-319-10780-4',
                note: 'PMIC 方向系统性读物之一。'
              }
            ]
          },
          {
            id: 'power-management-1',
            title: '阶段 2：开关电源和稳定性',
            goal: '把电力电子的平均模型、补偿和效率分析接到片上实现。',
            modules: [
              {
                id: 'power-management-m1',
                title: '阶段 2：开关电源和稳定性',
                purpose: '把电力电子的平均模型、补偿和效率分析接到片上实现。',
                lessonPlaceholders: [
                  '推 Buck CCM/DCM 基本关系',
                  '解释 Type-II/Type-III compensation',
                  '读懂 load transient 图'
                ],
                relatedKeywords: [
                  '推 Buck CCM/DCM 基本关系',
                  '解释 Type-II/Type-III compensation',
                  '读懂 load transient 图'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '推 Buck CCM/DCM 基本关系',
              '解释 Type-II/Type-III compensation',
              '读懂 load transient 图'
            ],
            resources: [
              {
                title: 'SiliconScope PMIC 论文搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'LDO',
                note: '补齐本地 PMIC 论文 reading list。'
              }
            ]
          },
          {
            id: 'power-management-2',
            title: '阶段 3：高集成与系统约束',
            goal: '处理多电源域、封装、电磁干扰、热和可靠性问题。',
            modules: [
              {
                id: 'power-management-m2',
                title: '阶段 3：高集成与系统约束',
                purpose: '处理多电源域、封装、电磁干扰、热和可靠性问题。',
                lessonPlaceholders: [
                  '整理一个手机 PMIC rail map',
                  '比较 inductive 与 switched-cap 架构',
                  '做近十年 ISSCC PMIC 指标表'
                ],
                relatedKeywords: [
                  '整理一个手机 PMIC rail map',
                  '比较 inductive 与 switched-cap 架构',
                  '做近十年 ISSCC PMIC 指标表'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '整理一个手机 PMIC rail map',
              '比较 inductive 与 switched-cap 架构',
              '做近十年 ISSCC PMIC 指标表'
            ],
            resources: [
              {
                title: 'IEEE TPEL topic search',
                kind: 'guide',
                provider: 'IEEE Xplore',
                url: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=63',
                note: '功率电子和电源控制的补充入口。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Analog & Mixed-Signal',
          'RF/mmWave & Wireline'
        ],
    relatedVenues:     [
          'ISSCC',
          'JSSC',
          'CICC',
          'A-SSCC',
          'TCAS-I',
          'TPEL'
        ],
    relatedSearchQueries:     [
          'PMIC',
          'LDO',
          'DC-DC',
          'buck converter',
          'switched-capacitor'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'circuit',
    accent: '#f59e0b',
    subtitle: 'LDO、Buck/Boost、Switched-Cap、Charge Pump、BMS，是所有 SoC 和移动设备的供电基础。',
    paperQuery: 'PMIC OR LDO OR DC-DC OR buck converter OR switched-capacitor',
    venues:     [
          'ISSCC',
          'JSSC',
          'CICC',
          'A-SSCC',
          'TCAS-I',
          'TPEL'
        ],
    foundation:     [
          '模拟电路',
          '功率电子',
          '控制理论',
          '开关电源',
          '版图寄生',
          '热与可靠性'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '电源方向既看电路，也看能量和控制。',
            items: [
              '运放与基准',
              '反馈补偿',
              '电感/电容能量',
              '开关损耗',
              '负载瞬态'
            ]
          },
          {
            title: '继续加深',
            note: '高性能 PMIC 常常卡在效率、面积、EMI 和可靠性。',
            items: [
              '多相 Buck',
              'SC converter',
              '数字控制',
              '封装寄生',
              '电池管理'
            ]
          }
        ],
    outcomes:     [
          '能判断 DC-DC/LDO 架构归属',
          '能读懂效率曲线和 transient 指标',
          '能把 PMIC 论文正确归到电源方向'
        ],
    projectIdeas:     [
          '做 LDO/BUCK/SC converter 架构表',
          '把 DC-DC 论文从 RFIC 误分类中纠正出来',
          '整理 PMIC 强校/研究者与课题组线索'
        ],
  },
  {
    slug: 'bio-sensor-mems',
    title: '传感接口 / 生物电子 / MEMS',
    shortTitle: '传感接口 / 生物电子 / MEMS',
    domain: 'Biomedical & Sensor Interfaces',
    level: 'research',
    description: 'AFE、神经接口、图像传感读出、MEMS 传感和植入式系统，把低噪声模拟前端接到真实世界。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          '运放噪声',
          'chopper / auto-zero',
          '仪表放大器',
          '滤波器',
          '低功耗 ADC',
          '电化学/电容/光学传感',
          '神经信号频段',
          '图像传感读出',
          'MEMS 工艺',
          '无线供能'
        ],
    stages:     [
          {
            id: 'bio-sensor-mems-0',
            title: '阶段 1：低噪声模拟前端',
            goal: '围绕微弱信号读出，建立 noise、offset、CMRR 和滤波直觉。',
            modules: [
              {
                id: 'bio-sensor-mems-m0',
                title: '阶段 1：低噪声模拟前端',
                purpose: '围绕微弱信号读出，建立 noise、offset、CMRR 和滤波直觉。',
                lessonPlaceholders: [
                  '计算 input-referred noise',
                  '解释 chopper 稳零',
                  '画 EEG/ECG AFE 框图'
                ],
                relatedKeywords: [
                  '计算 input-referred noise',
                  '解释 chopper 稳零',
                  '画 EEG/ECG AFE 框图'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '计算 input-referred noise',
              '解释 chopper 稳零',
              '画 EEG/ECG AFE 框图'
            ],
            resources: [
              {
                title: 'SiliconScope sensor AFE 搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'sensor',
                note: '从论文库切入 AFE 和神经接口。'
              }
            ]
          },
          {
            id: 'bio-sensor-mems-1',
            title: '阶段 2：传感器和系统',
            goal: '把电路接到具体物理量，理解传感器输出模型和系统约束。',
            modules: [
              {
                id: 'bio-sensor-mems-m1',
                title: '阶段 2：传感器和系统',
                purpose: '把电路接到具体物理量，理解传感器输出模型和系统约束。',
                lessonPlaceholders: [
                  '比较电容/电化学/光学读出',
                  '整理一个 implantable system block diagram',
                  '读一篇图像传感器 readout 论文'
                ],
                relatedKeywords: [
                  '比较电容/电化学/光学读出',
                  '整理一个 implantable system block diagram',
                  '读一篇图像传感器 readout 论文'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '比较电容/电化学/光学读出',
              '整理一个 implantable system block diagram',
              '读一篇图像传感器 readout 论文'
            ],
            resources: [
              {
                title: 'IEEE TBioCAS',
                kind: 'guide',
                provider: 'IEEE',
                url: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=4156126',
                note: '生物电路和系统方向常见期刊。'
              }
            ]
          },
          {
            id: 'bio-sensor-mems-2',
            title: '阶段 3：小型化、无线和可靠性',
            goal: '考虑植入、可穿戴、长期漂移和安全标准。',
            modules: [
              {
                id: 'bio-sensor-mems-m2',
                title: '阶段 3：小型化、无线和可靠性',
                purpose: '考虑植入、可穿戴、长期漂移和安全标准。',
                lessonPlaceholders: [
                  '整理无线供能方案',
                  '解释 electrode offset 问题',
                  '比较可穿戴和植入式功耗预算'
                ],
                relatedKeywords: [
                  '整理无线供能方案',
                  '解释 electrode offset 问题',
                  '比较可穿戴和植入式功耗预算'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '整理无线供能方案',
              '解释 electrode offset 问题',
              '比较可穿戴和植入式功耗预算'
            ],
            resources: [
              {
                title: 'MEMS Journal',
                kind: 'guide',
                provider: 'IEEE',
                url: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=84',
                note: 'MEMS 器件和微系统补充入口。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Analog & Mixed-Signal',
          'RF/mmWave & Wireline'
        ],
    relatedVenues:     [
          'ISSCC',
          'JSSC',
          'TBioCAS',
          'Sensors Journal',
          'MEMS',
          'Transducers'
        ],
    relatedSearchQueries:     [
          'analog front-end sensor interface neural recording MEMS biomedical IC'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'circuit',
    accent: '#10b981',
    subtitle: 'AFE、神经接口、图像传感读出、MEMS 传感和植入式系统，把低噪声模拟前端接到真实世界。',
    paperQuery: 'analog front-end sensor interface neural recording MEMS biomedical IC',
    venues:     [
          'ISSCC',
          'JSSC',
          'TBioCAS',
          'Sensors Journal',
          'MEMS',
          'Transducers'
        ],
    foundation:     [
          '低噪声模拟',
          '传感器物理',
          '信号处理',
          '生物电基础',
          'ADC',
          '低功耗系统'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '传感接口首先是低噪声、低功耗、抗干扰。',
            items: [
              '运放噪声',
              'chopper / auto-zero',
              '仪表放大器',
              '滤波器',
              '低功耗 ADC'
            ]
          },
          {
            title: '继续加深',
            note: '不同传感器对应不同物理和系统约束。',
            items: [
              '电化学/电容/光学传感',
              '神经信号频段',
              '图像传感读出',
              'MEMS 工艺',
              '无线供能'
            ]
          }
        ],
    outcomes:     [
          '能区分 AFE/ADC/传感器本体',
          '能读懂 input-referred noise',
          '能理解生物医疗芯片的功耗和安全约束'
        ],
    projectIdeas:     [
          '做神经接口 AFE 指标表',
          '整理 image sensor readout 架构',
          '做传感器类型和读出电路映射表'
        ],
  },
  {
    slug: 'digital-asic',
    title: '数字 IC / ASIC / SoC',
    shortTitle: '数字 IC / ASIC / SoC',
    domain: 'Digital IC & Architecture',
    level: 'foundation',
    description: '从数字逻辑、HDL、验证到综合、时序收敛和后端，是把算法真正落到硅片上的路径。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          '组合/时序逻辑',
          'FSM',
          'Verilog RTL',
          'testbench',
          '时钟/复位',
          '综合',
          'STA',
          'UPF 低功耗',
          'CDC/RDC',
          '后端约束'
        ],
    stages:     [
          {
            id: 'digital-asic-0',
            title: '阶段 1：RTL 思维',
            goal: '把“写程序”切换成“描述并发硬件”。',
            modules: [
              {
                id: 'digital-asic-m0',
                title: '阶段 1：RTL 思维',
                purpose: '把“写程序”切换成“描述并发硬件”。',
                lessonPlaceholders: [
                  '写同步 FIFO',
                  '写 testbench 覆盖边界条件',
                  '理解 blocking/non-blocking 差异'
                ],
                relatedKeywords: [
                  '写同步 FIFO',
                  '写 testbench 覆盖边界条件',
                  '理解 blocking/non-blocking 差异'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '写同步 FIFO',
              '写 testbench 覆盖边界条件',
              '理解 blocking/non-blocking 差异'
            ],
            resources: [
              {
                title: 'Digital Design and Computer Architecture',
                kind: 'book',
                provider: 'Harris & Harris',
                url: 'https://www.elsevier.com/books/digital-design-and-computer-architecture/harris/978-0-12-820064-3',
                note: '数字逻辑到体系结构的平滑路线。'
              },
              {
                title: 'Nand2Tetris',
                kind: 'course',
                provider: 'Hebrew University',
                url: 'https://www.nand2tetris.org/',
                note: '用项目把硬件和软件栈串起来。'
              }
            ]
          },
          {
            id: 'digital-asic-1',
            title: '阶段 2：验证和综合',
            goal: '知道 RTL 不是终点，验证、综合和约束决定能不能交付。',
            modules: [
              {
                id: 'digital-asic-m1',
                title: '阶段 2：验证和综合',
                purpose: '知道 RTL 不是终点，验证、综合和约束决定能不能交付。',
                lessonPlaceholders: [
                  '写一个带断言的 testbench',
                  '跑 Yosys/OpenROAD 小设计',
                  '理解 setup/hold violation'
                ],
                relatedKeywords: [
                  '写一个带断言的 testbench',
                  '跑 Yosys/OpenROAD 小设计',
                  '理解 setup/hold violation'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '写一个带断言的 testbench',
              '跑 Yosys/OpenROAD 小设计',
              '理解 setup/hold violation'
            ],
            resources: [
              {
                title: 'OpenROAD flow',
                kind: 'tool',
                provider: 'OpenROAD',
                url: 'https://theopenroadproject.org/',
                note: '开源后端流程，适合做教学和验证。'
              }
            ]
          },
          {
            id: 'digital-asic-2',
            title: '阶段 3：系统级设计',
            goal: '围绕 cache、NoC、accelerator、memory hierarchy 做架构判断。',
            modules: [
              {
                id: 'digital-asic-m2',
                title: '阶段 3：系统级设计',
                purpose: '围绕 cache、NoC、accelerator、memory hierarchy 做架构判断。',
                lessonPlaceholders: [
                  '读懂一篇 accelerator 架构论文',
                  '估算带宽/算力/片上存储瓶颈',
                  '把论文指标转成表格'
                ],
                relatedKeywords: [
                  '读懂一篇 accelerator 架构论文',
                  '估算带宽/算力/片上存储瓶颈',
                  '把论文指标转成表格'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '读懂一篇 accelerator 架构论文',
              '估算带宽/算力/片上存储瓶颈',
              '把论文指标转成表格'
            ],
            resources: [
              {
                title: 'SiliconScope 架构论文搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'accelerator',
                note: '把数据库里的架构方向论文接到学习路线。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Digital IC & Architecture',
          'Memory & Compute-in-Memory'
        ],
    relatedVenues:     [
          'ISSCC',
          'JSSC',
          'DAC',
          'ICCAD',
          'ISCA',
          'MICRO'
        ],
    relatedSearchQueries:     [
          'ASIC',
          'SoC',
          'digital IC',
          'processor',
          'accelerator'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'digital-system',
    accent: '#2563eb',
    subtitle: '从数字逻辑、HDL、验证到综合、时序收敛和后端，是把算法真正落到硅片上的路径。',
    paperQuery: 'ASIC OR SoC OR digital IC OR processor OR accelerator',
    venues:     [
          'ISSCC',
          'JSSC',
          'DAC',
          'ICCAD',
          'ISCA',
          'MICRO'
        ],
    foundation:     [
          '数字逻辑',
          'Verilog/SystemVerilog',
          '计算机组成',
          '脚本自动化',
          'Linux',
          '时序分析'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '数字设计入门相对清晰，但工程细节很多。',
            items: [
              '组合/时序逻辑',
              'FSM',
              'Verilog RTL',
              'testbench',
              '时钟/复位'
            ]
          },
          {
            title: '继续加深',
            note: '走向 ASIC 要补工具流和物理实现。',
            items: [
              '综合',
              'STA',
              'UPF 低功耗',
              'CDC/RDC',
              '后端约束'
            ]
          }
        ],
    outcomes:     [
          '能写可综合 RTL',
          '能跑基本仿真和综合',
          '能读 SoC/ASIC 论文的面积功耗频率指标'
        ],
    projectIdeas:     [
          '用 Verilog 写 tiny RISC-V 子集',
          '跑一次开源综合到 GDS 的 toy flow',
          '做 ISSCC AI accelerator 架构对比表'
        ],
  },
  {
    slug: 'verification-dft',
    title: '数字验证 / DFT / 测试',
    shortTitle: '数字验证 / DFT / 测试',
    domain: 'EDA, CAD & Verification',
    level: 'intermediate',
    description: '验证是数字 IC 最大工程工作量之一，DFT 和量产测试决定芯片能否可靠交付。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          'SV 语法',
          'assertion',
          'coverage',
          'random constraint',
          'scoreboard',
          'scan chain',
          'ATPG',
          'BIST',
          'boundary scan',
          'fault coverage'
        ],
    stages:     [
          {
            id: 'verification-dft-0',
            title: '阶段 1：从 testbench 到验证方法学',
            goal: '建立 stimulus、checker、coverage、scoreboard 的验证闭环。',
            modules: [
              {
                id: 'verification-dft-m0',
                title: '阶段 1：从 testbench 到验证方法学',
                purpose: '建立 stimulus、checker、coverage、scoreboard 的验证闭环。',
                lessonPlaceholders: [
                  '给 FIFO 写 assertion',
                  '写 constrained random test',
                  '整理 coverage hole'
                ],
                relatedKeywords: [
                  '给 FIFO 写 assertion',
                  '写 constrained random test',
                  '整理 coverage hole'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '给 FIFO 写 assertion',
              '写 constrained random test',
              '整理 coverage hole'
            ],
            resources: [
              {
                title: 'Verification Academy',
                kind: 'course',
                provider: 'Siemens EDA',
                url: 'https://verificationacademy.com/',
                note: 'SystemVerilog/UVM 工程资源入口。'
              }
            ]
          },
          {
            id: 'verification-dft-1',
            title: '阶段 2：形式验证和 CDC',
            goal: '用数学约束补齐仿真无法覆盖的状态空间。',
            modules: [
              {
                id: 'verification-dft-m1',
                title: '阶段 2：形式验证和 CDC',
                purpose: '用数学约束补齐仿真无法覆盖的状态空间。',
                lessonPlaceholders: [
                  '写 SVA property',
                  '解释 deadlock/liveness',
                  '检查一个 CDC crossing'
                ],
                relatedKeywords: [
                  '写 SVA property',
                  '解释 deadlock/liveness',
                  '检查一个 CDC crossing'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '写 SVA property',
              '解释 deadlock/liveness',
              '检查一个 CDC crossing'
            ],
            resources: [
              {
                title: 'SiliconScope verification 搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'formal',
                note: '查找验证和形式方法论文。'
              }
            ]
          },
          {
            id: 'verification-dft-2',
            title: '阶段 3：DFT 和量产测试',
            goal: '理解芯片制造后如何被测试、筛选和诊断。',
            modules: [
              {
                id: 'verification-dft-m2',
                title: '阶段 3：DFT 和量产测试',
                purpose: '理解芯片制造后如何被测试、筛选和诊断。',
                lessonPlaceholders: [
                  '画 scan chain',
                  '解释 stuck-at/transition fault',
                  '比较 MBIST/LBIST'
                ],
                relatedKeywords: [
                  '画 scan chain',
                  '解释 stuck-at/transition fault',
                  '比较 MBIST/LBIST'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '画 scan chain',
              '解释 stuck-at/transition fault',
              '比较 MBIST/LBIST'
            ],
            resources: [
              {
                title: 'International Test Conference',
                kind: 'guide',
                provider: 'ITC',
                url: 'https://www.itctestweek.org/',
                note: 'DFT/测试方向会议入口。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Digital IC & Architecture',
          'Memory & Compute-in-Memory'
        ],
    relatedVenues:     [
          'DAC',
          'ICCAD',
          'DATE',
          'ITC',
          'VTS',
          'TCAD'
        ],
    relatedSearchQueries:     [
          'SystemVerilog UVM verification DFT scan ATPG BIST chip test'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'digital-system',
    accent: '#0f766e',
    subtitle: '验证是数字 IC 最大工程工作量之一，DFT 和量产测试决定芯片能否可靠交付。',
    paperQuery: 'SystemVerilog UVM verification DFT scan ATPG BIST chip test',
    venues:     [
          'DAC',
          'ICCAD',
          'DATE',
          'ITC',
          'VTS',
          'TCAD'
        ],
    foundation:     [
          '数字逻辑',
          'SystemVerilog',
          '脚本自动化',
          '形式验证',
          '故障模型',
          '测试向量'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '验证不是写更多 testbench，而是建立覆盖和约束思维。',
            items: [
              'SV 语法',
              'assertion',
              'coverage',
              'random constraint',
              'scoreboard'
            ]
          },
          {
            title: '继续加深',
            note: 'DFT 需要理解制造缺陷和量产测试。',
            items: [
              'scan chain',
              'ATPG',
              'BIST',
              'boundary scan',
              'fault coverage'
            ]
          }
        ],
    outcomes:     [
          '能搭建模块级验证环境',
          '能读覆盖率报告',
          '能理解 scan/ATPG/BIST 基本流程'
        ],
    projectIdeas:     [
          '给 tiny CPU 做 UVM-lite 验证计划',
          '做 CDC bug checklist',
          '整理 scan/ATPG/BIST 学习卡片'
        ],
  },
  {
    slug: 'architecture-accelerator',
    title: '处理器架构 / AI 加速器',
    shortTitle: '处理器架构 / AI 加速器',
    domain: 'Digital IC & Architecture',
    level: 'intermediate',
    description: 'CPU、GPU、NPU、NoC、存储层次和编译映射，核心是算力、带宽、功耗和可编程性的平衡。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          '流水线',
          'cache',
          'memory bandwidth',
          'parallelism',
          'roofline',
          'GEMM/conv',
          'dataflow',
          'sparsity',
          'quantization',
          'compiler mapping'
        ],
    stages:     [
          {
            id: 'architecture-accelerator-0',
            title: '阶段 1：体系结构基本功',
            goal: '理解流水线、cache、乱序、并行和内存系统。',
            modules: [
              {
                id: 'architecture-accelerator-m0',
                title: '阶段 1：体系结构基本功',
                purpose: '理解流水线、cache、乱序、并行和内存系统。',
                lessonPlaceholders: [
                  '画五级流水线',
                  '解释 cache miss penalty',
                  '用 roofline 分析算子瓶颈'
                ],
                relatedKeywords: [
                  '画五级流水线',
                  '解释 cache miss penalty',
                  '用 roofline 分析算子瓶颈'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '画五级流水线',
              '解释 cache miss penalty',
              '用 roofline 分析算子瓶颈'
            ],
            resources: [
              {
                title: 'Computer Architecture: A Quantitative Approach',
                kind: 'book',
                provider: 'Hennessy & Patterson',
                url: 'https://www.elsevier.com/books/computer-architecture/hennessy/978-0-12-811905-1',
                note: '体系结构经典。'
              }
            ]
          },
          {
            id: 'architecture-accelerator-1',
            title: '阶段 2：AI 加速器数据流',
            goal: '围绕矩阵乘、卷积、attention 和片上存储设计数据搬运。',
            modules: [
              {
                id: 'architecture-accelerator-m1',
                title: '阶段 2：AI 加速器数据流',
                purpose: '围绕矩阵乘、卷积、attention 和片上存储设计数据搬运。',
                lessonPlaceholders: [
                  '比较 weight/output/row stationary',
                  '算 SRAM reuse',
                  '读一篇 TPU/Eyeriss 类论文'
                ],
                relatedKeywords: [
                  '比较 weight/output/row stationary',
                  '算 SRAM reuse',
                  '读一篇 TPU/Eyeriss 类论文'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '比较 weight/output/row stationary',
              '算 SRAM reuse',
              '读一篇 TPU/Eyeriss 类论文'
            ],
            resources: [
              {
                title: 'SiliconScope accelerator 搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'AI',
                note: '本地数据库里的架构和加速器论文入口。'
              }
            ]
          },
          {
            id: 'architecture-accelerator-2',
            title: '阶段 3：软硬件协同',
            goal: '把 ISA、compiler、runtime 和硬件限制一起考虑。',
            modules: [
              {
                id: 'architecture-accelerator-m2',
                title: '阶段 3：软硬件协同',
                purpose: '把 ISA、compiler、runtime 和硬件限制一起考虑。',
                lessonPlaceholders: [
                  '写一个算子 mapping 表',
                  '理解 TVM/MLIR 基本作用',
                  '比较可编程性与效率'
                ],
                relatedKeywords: [
                  '写一个算子 mapping 表',
                  '理解 TVM/MLIR 基本作用',
                  '比较可编程性与效率'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '写一个算子 mapping 表',
              '理解 TVM/MLIR 基本作用',
              '比较可编程性与效率'
            ],
            resources: [
              {
                title: 'MLIR project',
                kind: 'tool',
                provider: 'LLVM',
                url: 'https://mlir.llvm.org/',
                note: '编译器和硬件协同的重要基础设施。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Digital IC & Architecture',
          'Memory & Compute-in-Memory'
        ],
    relatedVenues:     [
          'ISCA',
          'MICRO',
          'HPCA',
          'ASPLOS',
          'ISSCC',
          'JSSC'
        ],
    relatedSearchQueries:     [
          'processor architecture AI accelerator NPU GPU NoC memory hierarchy'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'digital-system',
    accent: '#4f46e5',
    subtitle: 'CPU、GPU、NPU、NoC、存储层次和编译映射，核心是算力、带宽、功耗和可编程性的平衡。',
    paperQuery: 'processor architecture AI accelerator NPU GPU NoC memory hierarchy',
    venues:     [
          'ISCA',
          'MICRO',
          'HPCA',
          'ASPLOS',
          'ISSCC',
          'JSSC'
        ],
    foundation:     [
          '计算机组成',
          '体系结构',
          '数字设计',
          '并行计算',
          '编译原理',
          '机器学习基础'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '架构不是堆模块，而是瓶颈分析。',
            items: [
              '流水线',
              'cache',
              'memory bandwidth',
              'parallelism',
              'roofline'
            ]
          },
          {
            title: '继续加深',
            note: 'AI 加速器还要懂模型和数据流。',
            items: [
              'GEMM/conv',
              'dataflow',
              'sparsity',
              'quantization',
              'compiler mapping'
            ]
          }
        ],
    outcomes:     [
          '能读 accelerator 论文架构图',
          '能估算 TOPS/W 和带宽瓶颈',
          '能比较 systolic/dataflow/SIMD 取舍'
        ],
    projectIdeas:     [
          '做 NPU dataflow 对比表',
          '用 Python 写 roofline estimator',
          '整理 ISSCC AI accelerator 指标库'
        ],
  },
  {
    slug: 'fpga-reconfigurable',
    title: 'FPGA / 可重构计算',
    shortTitle: 'FPGA / 可重构计算',
    domain: 'Digital IC & Architecture',
    level: 'foundation',
    description: 'FPGA 是数字设计实战平台，也是一条研究路线：HLS、动态重构、低延迟加速、原型验证。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          'RTL',
          'testbench',
          'AXI/stream',
          'timing constraint',
          'BRAM/DSP',
          'HLS',
          'overlay',
          'partial reconfiguration',
          '低延迟 pipeline',
          'host-device runtime'
        ],
    stages:     [
          {
            id: 'fpga-reconfigurable-0',
            title: '阶段 1：板级数字设计',
            goal: '从仿真走到板子，建立时钟、复位、IO 和 debug 经验。',
            modules: [
              {
                id: 'fpga-reconfigurable-m0',
                title: '阶段 1：板级数字设计',
                purpose: '从仿真走到板子，建立时钟、复位、IO 和 debug 经验。',
                lessonPlaceholders: [
                  'LED/UART/SPI 小项目',
                  'ILA 抓波形',
                  '修一个 timing violation'
                ],
                relatedKeywords: [
                  'LED/UART/SPI 小项目',
                  'ILA 抓波形',
                  '修一个 timing violation'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              'LED/UART/SPI 小项目',
              'ILA 抓波形',
              '修一个 timing violation'
            ],
            resources: [
              {
                title: 'HDLBits',
                kind: 'course',
                provider: 'HDLBits',
                url: 'https://hdlbits.01xz.net/wiki/Main_Page',
                note: 'Verilog 练习非常适合入门。'
              }
            ]
          },
          {
            id: 'fpga-reconfigurable-1',
            title: '阶段 2：HLS 和加速器',
            goal: '理解 C/C++ 到硬件的限制，把循环、存储和并行显式化。',
            modules: [
              {
                id: 'fpga-reconfigurable-m1',
                title: '阶段 2：HLS 和加速器',
                purpose: '理解 C/C++ 到硬件的限制，把循环、存储和并行显式化。',
                lessonPlaceholders: [
                  '写 HLS matrix multiply',
                  '比较 pipeline/unroll/partition',
                  '估算带宽瓶颈'
                ],
                relatedKeywords: [
                  '写 HLS matrix multiply',
                  '比较 pipeline/unroll/partition',
                  '估算带宽瓶颈'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '写 HLS matrix multiply',
              '比较 pipeline/unroll/partition',
              '估算带宽瓶颈'
            ],
            resources: [
              {
                title: 'Xilinx Vitis HLS docs',
                kind: 'tool',
                provider: 'AMD/Xilinx',
                url: 'https://docs.amd.com/r/en-US/ug1399-vitis-hls',
                note: 'HLS 实战文档入口。'
              }
            ]
          },
          {
            id: 'fpga-reconfigurable-2',
            title: '阶段 3：可重构系统研究',
            goal: '关注 overlay、dynamic reconfiguration 和低延迟系统。',
            modules: [
              {
                id: 'fpga-reconfigurable-m2',
                title: '阶段 3：可重构系统研究',
                purpose: '关注 overlay、dynamic reconfiguration 和低延迟系统。',
                lessonPlaceholders: [
                  '读一篇 FPGA overlay 论文',
                  '画 host-FPGA 数据流',
                  '做低延迟 pipeline 指标表'
                ],
                relatedKeywords: [
                  '读一篇 FPGA overlay 论文',
                  '画 host-FPGA 数据流',
                  '做低延迟 pipeline 指标表'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '读一篇 FPGA overlay 论文',
              '画 host-FPGA 数据流',
              '做低延迟 pipeline 指标表'
            ],
            resources: [
              {
                title: 'SiliconScope FPGA 搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'FPGA',
                note: '找 FPGA 和可重构计算论文。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Digital IC & Architecture',
          'Memory & Compute-in-Memory'
        ],
    relatedVenues:     [
          'FPGA',
          'FCCM',
          'FPL',
          'DAC',
          'ICCAD',
          'MICRO'
        ],
    relatedSearchQueries:     [
          'FPGA reconfigurable computing HLS overlay accelerator'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'digital-system',
    accent: '#0284c7',
    subtitle: 'FPGA 是数字设计实战平台，也是一条研究路线：HLS、动态重构、低延迟加速、原型验证。',
    paperQuery: 'FPGA reconfigurable computing HLS overlay accelerator',
    venues:     [
          'FPGA',
          'FCCM',
          'FPL',
          'DAC',
          'ICCAD',
          'MICRO'
        ],
    foundation:     [
          '数字逻辑',
          'Verilog/VHDL',
          '时序约束',
          'C/C++',
          '并行计算',
          '接口协议'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: 'FPGA 入门看得见波形和板子，反馈最快。',
            items: [
              'RTL',
              'testbench',
              'AXI/stream',
              'timing constraint',
              'BRAM/DSP'
            ]
          },
          {
            title: '继续加深',
            note: '做研究会进入架构、HLS 和工具链。',
            items: [
              'HLS',
              'overlay',
              'partial reconfiguration',
              '低延迟 pipeline',
              'host-device runtime'
            ]
          }
        ],
    outcomes:     [
          '能在 FPGA 上跑一个完整 demo',
          '能读 HLS/overlay 论文',
          '能用 FPGA 给 ASIC 做原型验证'
        ],
    projectIdeas:     [
          '做 tiny CNN HLS 加速器',
          '用 FPGA 验证一个 RTL IP',
          '整理 FPGA/HLS 论文工具链'
        ],
  },
  {
    slug: 'devices-process',
    title: '器件、工艺与 CMOS 技术',
    shortTitle: '器件、工艺与 CMOS 技术',
    domain: 'Device & Manufacturing',
    level: 'research',
    description: '从半导体物理、器件、工艺到 PDK，是理解先进节点、可靠性和电路极限的根。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          '能带',
          'PN 结',
          'MOS 电容',
          'MOSFET I-V',
          '短沟道效应',
          'FinFET/GAA',
          'BEOL/FEOL',
          'TCAD',
          'BTI/HCI/EM',
          'PDK rule'
        ],
    stages:     [
          {
            id: 'devices-process-0',
            title: '阶段 1：物理和器件',
            goal: '从能带、PN 结、MOS 电容一路走到 MOSFET 工作机理。',
            modules: [
              {
                id: 'devices-process-m0',
                title: '阶段 1：物理和器件',
                purpose: '从能带、PN 结、MOS 电容一路走到 MOSFET 工作机理。',
                lessonPlaceholders: [
                  '画 MOS C-V 曲线',
                  '解释 short-channel effect',
                  '知道 FinFET/GAA 为什么出现'
                ],
                relatedKeywords: [
                  '画 MOS C-V 曲线',
                  '解释 short-channel effect',
                  '知道 FinFET/GAA 为什么出现'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '画 MOS C-V 曲线',
              '解释 short-channel effect',
              '知道 FinFET/GAA 为什么出现'
            ],
            resources: [
              {
                title: 'Semiconductor Device Fundamentals',
                kind: 'book',
                provider: 'R. F. Pierret',
                url: 'https://www.pearson.com/en-us/subject-catalog/p/semiconductor-device-fundamentals/P200000003176',
                note: '器件入门经典。'
              }
            ]
          },
          {
            id: 'devices-process-1',
            title: '阶段 2：工艺、PDK 和可靠性',
            goal: '知道版图规则背后的工艺约束，以及可靠性为什么会限制电路。',
            modules: [
              {
                id: 'devices-process-m1',
                title: '阶段 2：工艺、PDK 和可靠性',
                purpose: '知道版图规则背后的工艺约束，以及可靠性为什么会限制电路。',
                lessonPlaceholders: [
                  '读 DRC/LVS rule 摘要',
                  '理解 BEOL/FEOL 差异',
                  '整理 BTI/HCI/EM 关键词'
                ],
                relatedKeywords: [
                  '读 DRC/LVS rule 摘要',
                  '理解 BEOL/FEOL 差异',
                  '整理 BTI/HCI/EM 关键词'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '读 DRC/LVS rule 摘要',
              '理解 BEOL/FEOL 差异',
              '整理 BTI/HCI/EM 关键词'
            ],
            resources: [
              {
                title: 'SiliconScope 器件工艺论文搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'FinFET',
                note: '看 IEDM/VLSI 的方向变化。'
              }
            ]
          },
          {
            id: 'devices-process-2',
            title: '阶段 3：模型与设计协同',
            goal: '把器件模型、工艺波动和电路指标连接起来。',
            modules: [
              {
                id: 'devices-process-m2',
                title: '阶段 3：模型与设计协同',
                purpose: '把器件模型、工艺波动和电路指标连接起来。',
                lessonPlaceholders: [
                  '比较 BSIM 模型参数',
                  '解释 mismatch 来源',
                  '整理 PVT corner 对电路影响'
                ],
                relatedKeywords: [
                  '比较 BSIM 模型参数',
                  '解释 mismatch 来源',
                  '整理 PVT corner 对电路影响'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '比较 BSIM 模型参数',
              '解释 mismatch 来源',
              '整理 PVT corner 对电路影响'
            ],
            resources: [
              {
                title: 'BSIM models',
                kind: 'guide',
                provider: 'UC Berkeley',
                url: 'https://bsim.berkeley.edu/',
                note: '器件模型和电路仿真的接口。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Device & Manufacturing'
        ],
    relatedVenues:     [
          'IEDM',
          'VLSI',
          'IRPS',
          'EDL',
          'TED',
          'TCAD'
        ],
    relatedSearchQueries:     [
          'semiconductor device CMOS process integration FinFET GAA'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'device-manufacturing',
    accent: '#059669',
    subtitle: '从半导体物理、器件、工艺到 PDK，是理解先进节点、可靠性和电路极限的根。',
    paperQuery: 'semiconductor device CMOS process integration FinFET GAA',
    venues:     [
          'IEDM',
          'VLSI',
          'IRPS',
          'EDL',
          'TED',
          'TCAD'
        ],
    foundation:     [
          '大学物理',
          '量子力学',
          '固体物理',
          '半导体物理',
          '半导体器件',
          '工艺流程'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '器件路线对物理耐心要求高。',
            items: [
              '能带',
              'PN 结',
              'MOS 电容',
              'MOSFET I-V',
              '短沟道效应'
            ]
          },
          {
            title: '继续加深',
            note: '先进节点还要跟材料、工艺和可靠性一起看。',
            items: [
              'FinFET/GAA',
              'BEOL/FEOL',
              'TCAD',
              'BTI/HCI/EM',
              'PDK rule'
            ]
          }
        ],
    outcomes:     [
          '能读懂器件论文关键图',
          '能解释工艺缩放为什么变难',
          '能把 PDK 约束和电路设计联系起来'
        ],
    projectIdeas:     [
          '做 FinFET/GAA 论文时间线',
          '整理可靠性关键词和对应失效机理',
          '做 PDK rule 到 layout 约束映射表'
        ],
  },
  {
    slug: 'power-devices',
    title: '功率半导体 / 宽禁带器件',
    shortTitle: '功率半导体 / 宽禁带器件',
    domain: 'Device & Manufacturing',
    level: 'research',
    description: 'SiC、GaN、功率 MOSFET、IGBT 和高压集成，连接器件、工艺、电源和系统应用。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          '击穿',
          '导通电阻',
          '迁移率',
          '热阻',
          '雪崩与短路',
          'SiC/GaN 材料',
          '栅可靠性',
          '封装寄生',
          '驱动电路',
          '系统效率'
        ],
    stages:     [
          {
            id: 'power-devices-0',
            title: '阶段 1：高压器件基础',
            goal: '理解耐压、导通电阻和面积之间的基本权衡。',
            modules: [
              {
                id: 'power-devices-m0',
                title: '阶段 1：高压器件基础',
                purpose: '理解耐压、导通电阻和面积之间的基本权衡。',
                lessonPlaceholders: [
                  '解释 R_on vs BV trade-off',
                  '画功率 MOSFET 结构',
                  '整理 IGBT/MOSFET/GaN HEMT 差异'
                ],
                relatedKeywords: [
                  '解释 R_on vs BV trade-off',
                  '画功率 MOSFET 结构',
                  '整理 IGBT/MOSFET/GaN HEMT 差异'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '解释 R_on vs BV trade-off',
              '画功率 MOSFET 结构',
              '整理 IGBT/MOSFET/GaN HEMT 差异'
            ],
            resources: [
              {
                title: 'ISPSD conference',
                kind: 'guide',
                provider: 'IEEE / ISPSD',
                url: 'https://www.ispsd2025.com/',
                note: '功率半导体器件核心会议入口。'
              }
            ]
          },
          {
            id: 'power-devices-1',
            title: '阶段 2：宽禁带与可靠性',
            goal: '理解 SiC/GaN 为什么重要，也知道它们的问题在哪里。',
            modules: [
              {
                id: 'power-devices-m1',
                title: '阶段 2：宽禁带与可靠性',
                purpose: '理解 SiC/GaN 为什么重要，也知道它们的问题在哪里。',
                lessonPlaceholders: [
                  '比较 SiC 与 GaN 应用边界',
                  '解释 threshold instability',
                  '整理栅驱动需求'
                ],
                relatedKeywords: [
                  '比较 SiC 与 GaN 应用边界',
                  '解释 threshold instability',
                  '整理栅驱动需求'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '比较 SiC 与 GaN 应用边界',
              '解释 threshold instability',
              '整理栅驱动需求'
            ],
            resources: [
              {
                title: 'SiliconScope power device 搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'SiC',
                note: '查宽禁带器件和功率半导体论文。'
              }
            ]
          },
          {
            id: 'power-devices-2',
            title: '阶段 3：器件-封装-系统',
            goal: '把器件参数转成系统效率、热和 EMI 约束。',
            modules: [
              {
                id: 'power-devices-m2',
                title: '阶段 3：器件-封装-系统',
                purpose: '把器件参数转成系统效率、热和 EMI 约束。',
                lessonPlaceholders: [
                  '估算开关损耗',
                  '画功率模块寄生路径',
                  '比较 discrete 与 module'
                ],
                relatedKeywords: [
                  '估算开关损耗',
                  '画功率模块寄生路径',
                  '比较 discrete 与 module'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '估算开关损耗',
              '画功率模块寄生路径',
              '比较 discrete 与 module'
            ],
            resources: [
              {
                title: 'IEEE TPEL',
                kind: 'guide',
                provider: 'IEEE',
                url: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=63',
                note: '功率电子系统和应用补充入口。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Device & Manufacturing'
        ],
    relatedVenues:     [
          'IEDM',
          'ISPSD',
          'VLSI',
          'TED',
          'EDL',
          'TPEL'
        ],
    relatedSearchQueries:     [
          'power semiconductor SiC GaN IGBT power MOSFET wide bandgap'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'device-manufacturing',
    accent: '#ca8a04',
    subtitle: 'SiC、GaN、功率 MOSFET、IGBT 和高压集成，连接器件、工艺、电源和系统应用。',
    paperQuery: 'power semiconductor SiC GaN IGBT power MOSFET wide bandgap',
    venues:     [
          'IEDM',
          'ISPSD',
          'VLSI',
          'TED',
          'EDL',
          'TPEL'
        ],
    foundation:     [
          '半导体器件',
          '材料物理',
          '高压器件',
          '热设计',
          '可靠性',
          '功率电子'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '功率器件的核心是高压、大电流、热和可靠性。',
            items: [
              '击穿',
              '导通电阻',
              '迁移率',
              '热阻',
              '雪崩与短路'
            ]
          },
          {
            title: '继续加深',
            note: '宽禁带方向要补材料和封装。',
            items: [
              'SiC/GaN 材料',
              '栅可靠性',
              '封装寄生',
              '驱动电路',
              '系统效率'
            ]
          }
        ],
    outcomes:     [
          '能比较 Si/SiC/GaN 适用场景',
          '能读懂功率器件 trade-off',
          '能把器件和电源系统联系起来'
        ],
    projectIdeas:     [
          '做 SiC/GaN 应用地图',
          '整理 ISPSD 近年主题变化',
          '比较功率器件和 PMIC 路线差异'
        ],
  },
  {
    slug: 'advanced-packaging',
    title: '先进封装 / Chiplet / 异构集成',
    shortTitle: '先进封装 / Chiplet / 异构集成',
    domain: 'Device & Manufacturing',
    level: 'intermediate',
    description: '2.5D/3D、HBM、interposer、UCIe、thermal 和 signal integrity，让系统不再只靠单颗 SoC。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          'SoC 基础',
          'I/O 接口',
          '封装类型',
          '热阻',
          'SI/PI',
          'UCIe',
          'interposer',
          'HBM',
          'die-to-die link',
          'yield/cost model'
        ],
    stages:     [
          {
            id: 'advanced-packaging-0',
            title: '阶段 1：封装基本概念',
            goal: '建立 wire bond、flip-chip、fan-out、interposer、3D stacking 的地图。',
            modules: [
              {
                id: 'advanced-packaging-m0',
                title: '阶段 1：封装基本概念',
                purpose: '建立 wire bond、flip-chip、fan-out、interposer、3D stacking 的地图。',
                lessonPlaceholders: [
                  '画常见封装剖面',
                  '解释 bump/pad/interposer',
                  '比较 fan-out 和 2.5D'
                ],
                relatedKeywords: [
                  '画常见封装剖面',
                  '解释 bump/pad/interposer',
                  '比较 fan-out 和 2.5D'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '画常见封装剖面',
              '解释 bump/pad/interposer',
              '比较 fan-out 和 2.5D'
            ],
            resources: [
              {
                title: 'Heterogeneous Integration Roadmap',
                kind: 'guide',
                provider: 'HIR',
                url: 'https://eps.ieee.org/technology/heterogeneous-integration-roadmap.html',
                note: '先进封装和异构集成的大图景。'
              }
            ]
          },
          {
            id: 'advanced-packaging-1',
            title: '阶段 2：高速互连和内存墙',
            goal: '理解 HBM、die-to-die PHY 和封装布线如何影响系统性能。',
            modules: [
              {
                id: 'advanced-packaging-m1',
                title: '阶段 2：高速互连和内存墙',
                purpose: '理解 HBM、die-to-die PHY 和封装布线如何影响系统性能。',
                lessonPlaceholders: [
                  '估算 HBM 带宽',
                  '比较 parallel 与 serial die-to-die',
                  '读一篇 UCIe/BoW/AIB 资料'
                ],
                relatedKeywords: [
                  '估算 HBM 带宽',
                  '比较 parallel 与 serial die-to-die',
                  '读一篇 UCIe/BoW/AIB 资料'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '估算 HBM 带宽',
              '比较 parallel 与 serial die-to-die',
              '读一篇 UCIe/BoW/AIB 资料'
            ],
            resources: [
              {
                title: 'UCIe specification',
                kind: 'guide',
                provider: 'UCIe Consortium',
                url: 'https://www.uciexpress.org/specification',
                note: 'Chiplet 生态重要开放规范。'
              }
            ]
          },
          {
            id: 'advanced-packaging-2',
            title: '阶段 3：系统级权衡',
            goal: '把成本、良率、热、功耗和架构拆分一起考虑。',
            modules: [
              {
                id: 'advanced-packaging-m2',
                title: '阶段 3：系统级权衡',
                purpose: '把成本、良率、热、功耗和架构拆分一起考虑。',
                lessonPlaceholders: [
                  '做 chiplet partition 表',
                  '解释 known-good-die',
                  '画 thermal bottleneck'
                ],
                relatedKeywords: [
                  '做 chiplet partition 表',
                  '解释 known-good-die',
                  '画 thermal bottleneck'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '做 chiplet partition 表',
              '解释 known-good-die',
              '画 thermal bottleneck'
            ],
            resources: [
              {
                title: 'SiliconScope chiplet 搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'chiplet',
                note: '查看芯粒、封装和互连论文。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Device & Manufacturing'
        ],
    relatedVenues:     [
          'ECTC',
          'ISSCC',
          'VLSI',
          'IEDM',
          'DAC',
          'JSSC'
        ],
    relatedSearchQueries:     [
          'advanced packaging chiplet 2.5D 3D integration HBM interposer UCIe'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'device-manufacturing',
    accent: '#9333ea',
    subtitle: '2.5D/3D、HBM、interposer、UCIe、thermal 和 signal integrity，让系统不再只靠单颗 SoC。',
    paperQuery: 'advanced packaging chiplet 2.5D 3D integration HBM interposer UCIe',
    venues:     [
          'ECTC',
          'ISSCC',
          'VLSI',
          'IEDM',
          'DAC',
          'JSSC'
        ],
    foundation:     [
          '数字系统',
          '封装工艺',
          '信号完整性',
          '热设计',
          '高速接口',
          '系统架构'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '先进封装是系统、工艺和高速互连的交叉。',
            items: [
              'SoC 基础',
              'I/O 接口',
              '封装类型',
              '热阻',
              'SI/PI'
            ]
          },
          {
            title: '继续加深',
            note: 'Chiplet 需要协议、架构和制造生态共同理解。',
            items: [
              'UCIe',
              'interposer',
              'HBM',
              'die-to-die link',
              'yield/cost model'
            ]
          }
        ],
    outcomes:     [
          '能解释 2.5D/3D/chiplet 差异',
          '能读懂 die-to-die 互连指标',
          '能判断先进封装对架构的影响'
        ],
    projectIdeas:     [
          '画主流 AI GPU 封装拓扑',
          '整理 UCIe/BoW/AIB 对比',
          '做先进封装术语卡片'
        ],
  },
  {
    slug: 'eda-tools',
    title: 'EDA 与设计自动化',
    shortTitle: 'EDA 与设计自动化',
    domain: 'EDA, CAD & Verification',
    level: 'intermediate',
    description: '服务所有 IC 方向的底座：仿真、综合、布局布线、版图生成、验证和 AI for EDA。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          '图算法',
          '搜索/优化',
          'C++/Python',
          '数字设计流程',
          '文件格式',
          '逻辑综合',
          'placement/routing',
          'STA',
          'formal',
          'analog layout automation'
        ],
    stages:     [
          {
            id: 'eda-tools-0',
            title: '阶段 1：算法底座',
            goal: '把图、搜索、动态规划、线性/整数规划和启发式算法补扎实。',
            modules: [
              {
                id: 'eda-tools-m0',
                title: '阶段 1：算法底座',
                purpose: '把图、搜索、动态规划、线性/整数规划和启发式算法补扎实。',
                lessonPlaceholders: [
                  '实现 topological sort',
                  '理解 min-cut 和 shortest path',
                  '能读懂 simulated annealing'
                ],
                relatedKeywords: [
                  '实现 topological sort',
                  '理解 min-cut 和 shortest path',
                  '能读懂 simulated annealing'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '实现 topological sort',
              '理解 min-cut 和 shortest path',
              '能读懂 simulated annealing'
            ],
            resources: [
              {
                title: 'Algorithms, Part I/II',
                kind: 'course',
                provider: 'Princeton',
                url: 'https://algs4.cs.princeton.edu/home/',
                note: 'EDA 算法前置很稳。'
              }
            ]
          },
          {
            id: 'eda-tools-1',
            title: '阶段 2：VLSI CAD 主线',
            goal: '理解 synthesis、placement、routing、STA 的问题建模。',
            modules: [
              {
                id: 'eda-tools-m1',
                title: '阶段 2：VLSI CAD 主线',
                purpose: '理解 synthesis、placement、routing、STA 的问题建模。',
                lessonPlaceholders: [
                  '读一个 placement benchmark',
                  '解释 timing-driven placement',
                  '比较 SAT/SMT 在验证里的作用'
                ],
                relatedKeywords: [
                  '读一个 placement benchmark',
                  '解释 timing-driven placement',
                  '比较 SAT/SMT 在验证里的作用'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '读一个 placement benchmark',
              '解释 timing-driven placement',
              '比较 SAT/SMT 在验证里的作用'
            ],
            resources: [
              {
                title: 'VLSI CAD: Logic to Layout',
                kind: 'course',
                provider: 'UIUC / Coursera',
                url: 'https://www.coursera.org/learn/vlsi-cad-logic',
                note: 'ic-guide 也把它放在 EDA 路线核心位置。'
              }
            ]
          },
          {
            id: 'eda-tools-2',
            title: '阶段 3：连接真实设计流',
            goal: '把算法接入真实 netlist、layout、timing report，而不是只跑 toy example。',
            modules: [
              {
                id: 'eda-tools-m2',
                title: '阶段 3：连接真实设计流',
                purpose: '把算法接入真实 netlist、layout、timing report，而不是只跑 toy example。',
                lessonPlaceholders: [
                  '解析 DEF/LEF 或 Verilog netlist',
                  '跑一次 OpenROAD',
                  '做一个 AI 辅助版图/分类小工具'
                ],
                relatedKeywords: [
                  '解析 DEF/LEF 或 Verilog netlist',
                  '跑一次 OpenROAD',
                  '做一个 AI 辅助版图/分类小工具'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '解析 DEF/LEF 或 Verilog netlist',
              '跑一次 OpenROAD',
              '做一个 AI 辅助版图/分类小工具'
            ],
            resources: [
              {
                title: 'SiliconScope EDA 论文搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'EDA',
                note: '可用本地论文库生成 reading list。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'EDA, CAD & Verification'
        ],
    relatedVenues:     [
          'DAC',
          'ICCAD',
          'DATE',
          'TCAD',
          'TCAS',
          'ASP-DAC'
        ],
    relatedSearchQueries:     [
          'EDA',
          'placement',
          'routing',
          'verification',
          'analog layout automation'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'cad-security',
    accent: '#7c3aed',
    subtitle: '服务所有 IC 方向的底座：仿真、综合、布局布线、版图生成、验证和 AI for EDA。',
    paperQuery: 'EDA OR placement OR routing OR verification OR analog layout automation',
    venues:     [
          'DAC',
          'ICCAD',
          'DATE',
          'TCAD',
          'TCAS',
          'ASP-DAC'
        ],
    foundation:     [
          '数据结构与算法',
          '图算法',
          '优化',
          'C++/Python',
          '编译原理',
          'VLSI CAD'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: 'EDA 是 CS 算法和 IC 约束的结合。',
            items: [
              '图算法',
              '搜索/优化',
              'C++/Python',
              '数字设计流程',
              '文件格式'
            ]
          },
          {
            title: '继续加深',
            note: '不同子方向差异很大。',
            items: [
              '逻辑综合',
              'placement/routing',
              'STA',
              'formal',
              'analog layout automation'
            ]
          }
        ],
    outcomes:     [
          '能读 VLSI CAD 论文问题建模',
          '能跑开源 EDA flow',
          '能把算法接到真实 netlist/layout/timing report'
        ],
    projectIdeas:     [
          '实现 tiny global placer',
          '做论文标题到 EDA 子方向的分类器',
          '解析 timing report 并画 dashboard'
        ],
  },
  {
    slug: 'hardware-security',
    title: '硬件安全 / 可信计算',
    shortTitle: '硬件安全 / 可信计算',
    domain: 'EDA, CAD & Verification',
    level: 'research',
    description: '侧信道、PUF、Trojan、TEE、加密加速和供应链可信，连接芯片架构、电路和安全攻防。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          'AES/RSA/ECC 基础',
          '微架构',
          '功耗/时序侧信道',
          'fault injection',
          'secure boot',
          'PUF',
          'Trojan detection',
          'TEE',
          'formal security',
          'supply-chain trust'
        ],
    stages:     [
          {
            id: 'hardware-security-0',
            title: '阶段 1：安全基础和攻击模型',
            goal: '建立 threat model，知道攻击者能观察什么、控制什么。',
            modules: [
              {
                id: 'hardware-security-m0',
                title: '阶段 1：安全基础和攻击模型',
                purpose: '建立 threat model，知道攻击者能观察什么、控制什么。',
                lessonPlaceholders: [
                  '解释 timing/power side-channel',
                  '画 secure boot chain',
                  '比较 software/hardware root of trust'
                ],
                relatedKeywords: [
                  '解释 timing/power side-channel',
                  '画 secure boot chain',
                  '比较 software/hardware root of trust'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '解释 timing/power side-channel',
              '画 secure boot chain',
              '比较 software/hardware root of trust'
            ],
            resources: [
              {
                title: 'CHES conference',
                kind: 'guide',
                provider: 'IACR',
                url: 'https://ches.iacr.org/',
                note: '密码硬件和嵌入式安全核心会议。'
              }
            ]
          },
          {
            id: 'hardware-security-1',
            title: '阶段 2：侧信道与防护',
            goal: '把功耗、电磁、时序泄漏与电路实现联系起来。',
            modules: [
              {
                id: 'hardware-security-m1',
                title: '阶段 2：侧信道与防护',
                purpose: '把功耗、电磁、时序泄漏与电路实现联系起来。',
                lessonPlaceholders: [
                  '做 CPA 攻击流程图',
                  '解释 masking/hiding',
                  '比较 DPA/EMA/FI'
                ],
                relatedKeywords: [
                  '做 CPA 攻击流程图',
                  '解释 masking/hiding',
                  '比较 DPA/EMA/FI'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '做 CPA 攻击流程图',
              '解释 masking/hiding',
              '比较 DPA/EMA/FI'
            ],
            resources: [
              {
                title: 'ChipWhisperer',
                kind: 'tool',
                provider: 'NewAE',
                url: 'https://chipwhisperer.readthedocs.io/',
                note: '侧信道学习和实验平台。'
              }
            ]
          },
          {
            id: 'hardware-security-2',
            title: '阶段 3：可信硬件和供应链',
            goal: '关注 PUF、Trojan、TEE、形式化和设计流程安全。',
            modules: [
              {
                id: 'hardware-security-m2',
                title: '阶段 3：可信硬件和供应链',
                purpose: '关注 PUF、Trojan、TEE、形式化和设计流程安全。',
                lessonPlaceholders: [
                  '解释 PUF enrollment',
                  '整理 Trojan detection 方法',
                  '读一篇 HOST 论文'
                ],
                relatedKeywords: [
                  '解释 PUF enrollment',
                  '整理 Trojan detection 方法',
                  '读一篇 HOST 论文'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '解释 PUF enrollment',
              '整理 Trojan detection 方法',
              '读一篇 HOST 论文'
            ],
            resources: [
              {
                title: 'SiliconScope hardware security 搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'hardware',
                note: '连接本地论文库。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'EDA, CAD & Verification'
        ],
    relatedVenues:     [
          'HOST',
          'CHES',
          'DAC',
          'ICCAD',
          'USENIX Security',
          'ISSCC'
        ],
    relatedSearchQueries:     [
          'hardware security side-channel PUF Trojan trusted execution cryptographic accelerator'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'cad-security',
    accent: '#be123c',
    subtitle: '侧信道、PUF、Trojan、TEE、加密加速和供应链可信，连接芯片架构、电路和安全攻防。',
    paperQuery: 'hardware security side-channel PUF Trojan trusted execution cryptographic accelerator',
    venues:     [
          'HOST',
          'CHES',
          'DAC',
          'ICCAD',
          'USENIX Security',
          'ISSCC'
        ],
    foundation:     [
          '数字系统',
          '密码学基础',
          '信号采集',
          '统计分析',
          '嵌入式系统',
          'EDA/测试'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '硬件安全需要懂攻击面，也懂硬件实现。',
            items: [
              'AES/RSA/ECC 基础',
              '微架构',
              '功耗/时序侧信道',
              'fault injection',
              'secure boot'
            ]
          },
          {
            title: '继续加深',
            note: '从算法安全到芯片供应链安全。',
            items: [
              'PUF',
              'Trojan detection',
              'TEE',
              'formal security',
              'supply-chain trust'
            ]
          }
        ],
    outcomes:     [
          '能理解侧信道攻击和防护',
          '能读安全芯片/加密加速器论文',
          '能把安全问题映射到电路/架构/EDA 层'
        ],
    projectIdeas:     [
          '做侧信道术语卡',
          '整理 PUF/Trojan/TEE 论文图谱',
          '用公开 trace 做 CPA 小实验'
        ],
  },
  {
    slug: 'memory-cim',
    title: '存储器 / 存算一体 / 近存计算',
    shortTitle: '存储器 / 存算一体 / 近存计算',
    domain: 'Memory & Compute-in-Memory',
    level: 'research',
    description: 'SRAM、DRAM、Flash、ReRAM、MRAM、CIM 和 PIM，核心是突破数据搬运和能效瓶颈。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          'SRAM bitcell',
          'sense amplifier',
          'memory hierarchy',
          'MAC/GEMM',
          'ADC/DAC 基础',
          'ReRAM/MRAM/FeFET',
          'analog CIM',
          'bit-serial compute',
          'calibration',
          'mapping'
        ],
    stages:     [
          {
            id: 'memory-cim-0',
            title: '阶段 1：存储器基本单元',
            goal: '理解 SRAM/DRAM/Flash 等基本读写和 sense 机制。',
            modules: [
              {
                id: 'memory-cim-m0',
                title: '阶段 1：存储器基本单元',
                purpose: '理解 SRAM/DRAM/Flash 等基本读写和 sense 机制。',
                lessonPlaceholders: [
                  '画 6T SRAM',
                  '解释 read disturb/write margin',
                  '比较 SRAM/DRAM/Flash'
                ],
                relatedKeywords: [
                  '画 6T SRAM',
                  '解释 read disturb/write margin',
                  '比较 SRAM/DRAM/Flash'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '画 6T SRAM',
              '解释 read disturb/write margin',
              '比较 SRAM/DRAM/Flash'
            ],
            resources: [
              {
                title: 'SiliconScope memory 搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'SRAM',
                note: '从 memory macro 论文入门。'
              }
            ]
          },
          {
            id: 'memory-cim-1',
            title: '阶段 2：存算一体电路',
            goal: '理解 bitline compute、analog MAC、ADC overhead 和误差来源。',
            modules: [
              {
                id: 'memory-cim-m1',
                title: '阶段 2：存算一体电路',
                purpose: '理解 bitline compute、analog MAC、ADC overhead 和误差来源。',
                lessonPlaceholders: [
                  '画 SRAM-CIM bitline MAC',
                  '估算 ADC 能耗占比',
                  '比较 analog/digital CIM'
                ],
                relatedKeywords: [
                  '画 SRAM-CIM bitline MAC',
                  '估算 ADC 能耗占比',
                  '比较 analog/digital CIM'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '画 SRAM-CIM bitline MAC',
              '估算 ADC 能耗占比',
              '比较 analog/digital CIM'
            ],
            resources: [
              {
                title: 'SiliconScope CIM 搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'compute-in-memory',
                note: '查 ISSCC/JSSC 的 CIM 代表论文。'
              }
            ]
          },
          {
            id: 'memory-cim-2',
            title: '阶段 3：架构映射和系统评估',
            goal: '把 macro 指标接到模型精度、吞吐和带宽上。',
            modules: [
              {
                id: 'memory-cim-m2',
                title: '阶段 3：架构映射和系统评估',
                purpose: '把 macro 指标接到模型精度、吞吐和带宽上。',
                lessonPlaceholders: [
                  '映射一层 conv/GEMM',
                  '比较 TOPS/W 是否公平',
                  '整理精度损失来源'
                ],
                relatedKeywords: [
                  '映射一层 conv/GEMM',
                  '比较 TOPS/W 是否公平',
                  '整理精度损失来源'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '映射一层 conv/GEMM',
              '比较 TOPS/W 是否公平',
              '整理精度损失来源'
            ],
            resources: [
              {
                title: 'MLPerf inference',
                kind: 'guide',
                provider: 'MLCommons',
                url: 'https://mlcommons.org/benchmarks/inference-datacenter/',
                note: '系统级性能评估参考。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Memory & Compute-in-Memory',
          'Digital IC & Architecture'
        ],
    relatedVenues:     [
          'ISSCC',
          'JSSC',
          'IEDM',
          'VLSI',
          'DAC',
          'ISCA'
        ],
    relatedSearchQueries:     [
          'SRAM DRAM ReRAM MRAM compute-in-memory processing-in-memory'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'frontier',
    accent: '#9333ea',
    subtitle: 'SRAM、DRAM、Flash、ReRAM、MRAM、CIM 和 PIM，核心是突破数据搬运和能效瓶颈。',
    paperQuery: 'SRAM DRAM ReRAM MRAM compute-in-memory processing-in-memory',
    venues:     [
          'ISSCC',
          'JSSC',
          'IEDM',
          'VLSI',
          'DAC',
          'ISCA'
        ],
    foundation:     [
          '数字电路',
          '存储器电路',
          '器件物理',
          'AI 算子',
          '数据转换器',
          '架构评估'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: 'CIM 是电路、器件和架构交叉。',
            items: [
              'SRAM bitcell',
              'sense amplifier',
              'memory hierarchy',
              'MAC/GEMM',
              'ADC/DAC 基础'
            ]
          },
          {
            title: '继续加深',
            note: '不同存储介质决定不同误差和系统约束。',
            items: [
              'ReRAM/MRAM/FeFET',
              'analog CIM',
              'bit-serial compute',
              'calibration',
              'mapping'
            ]
          }
        ],
    outcomes:     [
          '能区分 memory、near-memory、in-memory',
          '能读懂 CIM macro 指标',
          '能判断精度/能效/面积 trade-off'
        ],
    projectIdeas:     [
          '整理 SRAM-CIM vs ReRAM-CIM 对比',
          '做 CIM 论文指标数据库',
          '估算 ADC overhead 对 TOPS/W 的影响'
        ],
  },
  {
    slug: 'silicon-photonics',
    title: '硅光 / 光电子集成',
    shortTitle: '硅光 / 光电子集成',
    domain: 'RF/mmWave & Wireline',
    level: 'research',
    description: '调制器、探测器、激光耦合、光互连和光计算，面向数据中心互连和新型计算媒介。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          '波导',
          '调制器',
          '光探测器',
          'TIA',
          'SerDes',
          '封装耦合',
          'co-packaged optics',
          'laser integration',
          'thermal tuning',
          'WDM',
          'photonic compute'
        ],
    stages:     [
          {
            id: 'silicon-photonics-0',
            title: '阶段 1：光学和器件',
            goal: '理解光在波导中传播、调制和探测的基本机制。',
            modules: [
              {
                id: 'silicon-photonics-m0',
                title: '阶段 1：光学和器件',
                purpose: '理解光在波导中传播、调制和探测的基本机制。',
                lessonPlaceholders: [
                  '解释 ring modulator',
                  '画 photodiode + TIA',
                  '理解 insertion loss'
                ],
                relatedKeywords: [
                  '解释 ring modulator',
                  '画 photodiode + TIA',
                  '理解 insertion loss'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '解释 ring modulator',
              '画 photodiode + TIA',
              '理解 insertion loss'
            ],
            resources: [
              {
                title: 'Silicon Photonics Design',
                kind: 'guide',
                provider: 'University / foundry ecosystem',
                url: 'https://www.lumerical.com/learn/intro-to-photonics/',
                note: '硅光设计和仿真的入门入口。'
              }
            ]
          },
          {
            id: 'silicon-photonics-1',
            title: '阶段 2：高速光电接口',
            goal: '把光器件接到 TIA、driver、CDR、SerDes 系统。',
            modules: [
              {
                id: 'silicon-photonics-m1',
                title: '阶段 2：高速光电接口',
                purpose: '把光器件接到 TIA、driver、CDR、SerDes 系统。',
                lessonPlaceholders: [
                  '画 optical receiver chain',
                  '解释 bandwidth/sensitivity',
                  '读一篇 optical interconnect 论文'
                ],
                relatedKeywords: [
                  '画 optical receiver chain',
                  '解释 bandwidth/sensitivity',
                  '读一篇 optical interconnect 论文'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '画 optical receiver chain',
              '解释 bandwidth/sensitivity',
              '读一篇 optical interconnect 论文'
            ],
            resources: [
              {
                title: 'SiliconScope silicon photonics 搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'silicon',
                note: '查硅光和光互连论文。'
              }
            ]
          },
          {
            id: 'silicon-photonics-2',
            title: '阶段 3：封装和系统',
            goal: '理解 CPO、WDM、热调谐和系统可靠性。',
            modules: [
              {
                id: 'silicon-photonics-m2',
                title: '阶段 3：封装和系统',
                purpose: '理解 CPO、WDM、热调谐和系统可靠性。',
                lessonPlaceholders: [
                  '比较 pluggable optics 与 CPO',
                  '整理 WDM link budget',
                  '画 laser coupling 方案'
                ],
                relatedKeywords: [
                  '比较 pluggable optics 与 CPO',
                  '整理 WDM link budget',
                  '画 laser coupling 方案'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '比较 pluggable optics 与 CPO',
              '整理 WDM link budget',
              '画 laser coupling 方案'
            ],
            resources: [
              {
                title: 'OFC conference',
                kind: 'guide',
                provider: 'Optica / IEEE',
                url: 'https://www.ofcconference.org/',
                note: '光通信和光互连核心会议。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Memory & Compute-in-Memory',
          'Digital IC & Architecture'
        ],
    relatedVenues:     [
          'OFC',
          'CLEO',
          'ISSCC',
          'JLT',
          'Nature Photonics',
          'VLSI'
        ],
    relatedSearchQueries:     [
          'silicon photonics optical interconnect photonic integrated circuit modulator'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'frontier',
    accent: '#0891b2',
    subtitle: '调制器、探测器、激光耦合、光互连和光计算，面向数据中心互连和新型计算媒介。',
    paperQuery: 'silicon photonics optical interconnect photonic integrated circuit modulator',
    venues:     [
          'OFC',
          'CLEO',
          'ISSCC',
          'JLT',
          'Nature Photonics',
          'VLSI'
        ],
    foundation:     [
          '光学',
          '电磁场',
          '半导体器件',
          '模拟/RF',
          '高速接口',
          '封装耦合'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '硅光需要把光学和电子接口接起来。',
            items: [
              '波导',
              '调制器',
              '光探测器',
              'TIA',
              'SerDes',
              '封装耦合'
            ]
          },
          {
            title: '继续加深',
            note: '系统瓶颈常在光电协同和封装。',
            items: [
              'co-packaged optics',
              'laser integration',
              'thermal tuning',
              'WDM',
              'photonic compute'
            ]
          }
        ],
    outcomes:     [
          '能理解 optical link budget',
          '能读光电收发前端论文',
          '能看懂硅光和封装协同问题'
        ],
    projectIdeas:     [
          '做 optical interconnect 术语卡',
          '整理 CPO 论文路线',
          '比较 TIA 与 SerDes 指标'
        ],
  },
  {
    slug: 'quantum-neuromorphic',
    title: '量子芯片 / 类脑芯片',
    shortTitle: '量子芯片 / 类脑芯片',
    domain: 'Memory & Compute-in-Memory',
    level: 'research',
    description: '量子控制、低温 CMOS、SNN、神经形态计算，是更前沿但路径更分叉的方向。',
    targetUsers:     [
          'IC researchers',
          'Graduate students',
          'Industry engineers'
        ],
    prerequisites:     [
          '量子比特基础或 SNN 基础',
          '低噪声读出',
          '时钟/脉冲系统',
          '器件非理想性',
          '系统建模',
          'cryogenic CMOS',
          'qubit control',
          'memristor',
          'event-driven architecture',
          'learning rule'
        ],
    stages:     [
          {
            id: 'quantum-neuromorphic-0',
            title: '阶段 1：选主线',
            goal: '先决定量子控制、低温 CMOS、SNN 架构或新型器件，避免同时铺太宽。',
            modules: [
              {
                id: 'quantum-neuromorphic-m0',
                title: '阶段 1：选主线',
                purpose: '先决定量子控制、低温 CMOS、SNN 架构或新型器件，避免同时铺太宽。',
                lessonPlaceholders: [
                  '画 qubit control/readout chain 或 SNN dataflow',
                  '列出必须补的物理/算法概念',
                  '读 3 篇综述'
                ],
                relatedKeywords: [
                  '画 qubit control/readout chain 或 SNN dataflow',
                  '列出必须补的物理/算法概念',
                  '读 3 篇综述'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '画 qubit control/readout chain 或 SNN dataflow',
              '列出必须补的物理/算法概念',
              '读 3 篇综述'
            ],
            resources: [
              {
                title: 'SiliconScope frontier 搜索',
                kind: 'paper',
                provider: 'Local database',
                url: 'localSearch(\'cryogenic',
                note: '先用本地库摸清论文分布。'
              }
            ]
          },
          {
            id: 'quantum-neuromorphic-1',
            title: '阶段 2：接口电路和系统',
            goal: '理解低温、噪声、能耗、脉冲和可扩展性约束。',
            modules: [
              {
                id: 'quantum-neuromorphic-m1',
                title: '阶段 2：接口电路和系统',
                purpose: '理解低温、噪声、能耗、脉冲和可扩展性约束。',
                lessonPlaceholders: [
                  '解释 cryo-CMOS 难点',
                  '比较 rate coding/temporal coding',
                  '整理读出链指标'
                ],
                relatedKeywords: [
                  '解释 cryo-CMOS 难点',
                  '比较 rate coding/temporal coding',
                  '整理读出链指标'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '解释 cryo-CMOS 难点',
              '比较 rate coding/temporal coding',
              '整理读出链指标'
            ],
            resources: [
              {
                title: 'Nature Electronics',
                kind: 'guide',
                provider: 'Nature Portfolio',
                url: 'https://www.nature.com/natelectron/',
                note: '前沿芯片方向常见发表出口之一。'
              }
            ]
          },
          {
            id: 'quantum-neuromorphic-2',
            title: '阶段 3：从论文到可验证项目',
            goal: '做一个小仿真或小综述，而不是急着“流片”。',
            modules: [
              {
                id: 'quantum-neuromorphic-m2',
                title: '阶段 3：从论文到可验证项目',
                purpose: '做一个小仿真或小综述，而不是急着“流片”。',
                lessonPlaceholders: [
                  '复现 SNN 小网络',
                  '做量子控制链路图',
                  '整理新型器件优缺点'
                ],
                relatedKeywords: [
                  '复现 SNN 小网络',
                  '做量子控制链路图',
                  '整理新型器件优缺点'
                ],
                relatedPaperQueries: []
              }
            ],
            checkpoints: [
              '复现 SNN 小网络',
              '做量子控制链路图',
              '整理新型器件优缺点'
            ],
            resources: [
              {
                title: 'Brian2 SNN simulator',
                kind: 'tool',
                provider: 'Brian project',
                url: 'https://brian2.readthedocs.io/',
                note: '类脑/SNN 入门仿真工具之一。'
              }
            ]
          }
        ],
    relatedTopics:     [
          'Memory & Compute-in-Memory',
          'Digital IC & Architecture'
        ],
    relatedVenues:     [
          'ISSCC',
          'JSSC',
          'IEDM',
          'Nature Electronics',
          'ISCA',
          'AICAS'
        ],
    relatedSearchQueries:     [
          'quantum chip cryogenic CMOS neuromorphic SNN spiking neural network'
        ],
    caveat: 'Learning roadmaps are structured guides for IC research preparation, not a substitute for textbooks, lectures, datasheets, or advisor guidance.',
    family: 'frontier',
    accent: '#64748b',
    subtitle: '量子控制、低温 CMOS、SNN、神经形态计算，是更前沿但路径更分叉的方向。',
    paperQuery: 'quantum chip cryogenic CMOS neuromorphic SNN spiking neural network',
    venues:     [
          'ISSCC',
          'JSSC',
          'IEDM',
          'Nature Electronics',
          'ISCA',
          'AICAS'
        ],
    foundation:     [
          '量子力学',
          '低温电子学',
          '模拟/RF',
          '数字架构',
          '神经网络',
          '器件物理'
        ],
    prerequisitesGroups:     [
          {
            title: '必须先会',
            note: '这类方向分叉很大，先选量子或类脑主线。',
            items: [
              '量子比特基础或 SNN 基础',
              '低噪声读出',
              '时钟/脉冲系统',
              '器件非理想性',
              '系统建模'
            ]
          },
          {
            title: '继续加深',
            note: '需要跨学科论文阅读，不建议作为零基础第一站。',
            items: [
              'cryogenic CMOS',
              'qubit control',
              'memristor',
              'event-driven architecture',
              'learning rule'
            ]
          }
        ],
    outcomes:     [
          '能区分量子控制芯片和量子器件',
          '能理解 SNN/类脑芯片基本指标',
          '能判断哪些内容仍处研究探索期'
        ],
    projectIdeas:     [
          '做 cryo-CMOS 论文阅读清单',
          '复现一个小 SNN',
          '整理量子控制芯片 block diagram'
        ],
  },
  {
    slug: 'data-converters',
    title: '数据转换器 / ADC / DAC',
    shortTitle: 'ADC / DAC',
    domain: 'Analog & Mixed-Signal',
    level: 'advanced',
    description: '把 SAR、Pipeline、Delta-Sigma、Time-Interleaved ADC 和高速/高精度 DAC 从泛模拟路线中拆出来，专门训练采样、量化、校准和 FoM 思维。',
    targetUsers: ['模拟 IC 入门后想选 ADC/DAC 的学生', '需要读 JSSC/ISSCC 数据转换器论文的研究生', '做传感/通信/高速接口前端的工程师'],
    prerequisites: ['MOS 小信号与开关电容', '噪声与失配', '采样保持', '离散时间信号处理', 'MATLAB/Python 建模', '版图匹配和电容阵列'],
    stages: [
      {
        id: 'data-converters-0',
        title: '阶段 1：采样、量化和指标语言',
        goal: '把 ENOB、SNDR、SFDR、FoM、jitter、thermal noise、kT/C noise 变成可计算指标。',
        modules: [
          {
            id: 'adc-metrics',
            title: 'ADC/DAC 指标与误差预算',
            purpose: '建立从系统需求到分辨率、采样率、功耗和噪声预算的映射。',
            lessonPlaceholders: ['推导量化噪声和 ENOB', '整理 Walden/Schreier FoM', '比较 sensor ADC 与 wireline ADC 指标差异'],
            relatedKeywords: ['ENOB', 'SNDR', 'SFDR', 'Walden FoM', 'Schreier FoM'],
            relatedPaperQueries: ['ADC FoM SNDR ENOB ISSCC JSSC', 'DAC SFDR calibration JSSC'],
          },
        ],
        checkpoints: ['能读懂一篇 ADC abstract 里所有指标', '能判断论文指标是否 apples-to-apples', '能写一个行为级量化器模型'],
      },
      {
        id: 'data-converters-1',
        title: '阶段 2：主流架构',
        goal: '分别掌握 SAR、Pipeline、Delta-Sigma、Time-Interleaved、Nyquist DAC 的适用场景。',
        modules: [
          {
            id: 'adc-architectures',
            title: 'SAR / Pipeline / ΔΣ / TI ADC',
            purpose: '把架构选择和速度、精度、功耗、输入带宽、校准复杂度联系起来。',
            lessonPlaceholders: ['画 SAR ADC CDAC 和 comparator 时序', '解释 noise shaping', '比较 pipeline residue amplifier 与 calibration'],
            relatedKeywords: ['SAR ADC', 'pipeline ADC', 'delta sigma ADC', 'time-interleaved ADC', 'background calibration'],
            relatedPaperQueries: ['SAR ADC calibration', 'pipeline ADC residue amplifier', 'delta sigma noise shaping ADC'],
          },
        ],
        checkpoints: ['能说清每类 ADC 的瓶颈', '能根据应用选择架构', '能复现一个 behavioral model'],
      },
      {
        id: 'data-converters-2',
        title: '阶段 3：校准、版图和测试',
        goal: '进入论文真正难点：失配、非线性、时钟抖动、interleaving skew、片上/片外测试。',
        modules: [
          {
            id: 'adc-calibration-test',
            title: 'Calibration and measurement',
            purpose: '把误差源映射到 foreground/background/digital calibration 和测试计划。',
            lessonPlaceholders: ['整理 CDAC mismatch calibration', '推导 TI ADC timing skew 影响', '列出 FFT 测试 setup'],
            relatedKeywords: ['mismatch calibration', 'background calibration', 'FFT test', 'jitter limited ADC'],
            relatedPaperQueries: ['time interleaved ADC skew calibration', 'capacitor mismatch calibration SAR ADC'],
          },
        ],
        checkpoints: ['能设计一个 ADC 测试 checklist', '能解释 post-layout 后性能下降原因', '能读懂 calibration block diagram'],
      },
    ],
    relatedTopics: ['Analog & Mixed-Signal', 'ADC', 'DAC', 'Data Converter'],
    relatedVenues: ['ISSCC', 'JSSC', 'VLSI Symposium', 'CICC', 'TCAS-I'],
    relatedSearchQueries: ['SAR ADC', 'pipeline ADC', 'delta sigma ADC', 'time interleaved ADC', 'high speed DAC'],
    caveat: '数据转换器路线需要大量指标对齐和测试理解，不能只按论文 score 学。',
    family: 'circuit',
    accent: '#2563eb',
    subtitle: '数据转换器是模拟 IC 里最论文驱动的路线之一，核心是采样、量化、误差预算、校准和测试。',
    paperQuery: 'ADC OR DAC OR data converter OR SAR OR delta-sigma OR pipeline ADC',
    venues: ['ISSCC', 'JSSC', 'VLSI Symposium', 'CICC', 'TCAS-I'],
    foundation: ['模拟电路', '信号与系统', 'DSP', '概率噪声', 'SPICE + MATLAB/Python'],
    prerequisitesGroups: [
      { title: '电路基础', note: '先保证能做 transistor-level reasoning。', items: ['开关电容', '比较器', '运放', '基准和采样保持', '噪声与失配'] },
      { title: '系统基础', note: 'ADC/DAC 不是纯电路题。', items: ['采样定理', 'FFT 和窗函数', '离散时间系统', '量化噪声', '校准算法'] },
    ],
    outcomes: ['能独立读 ADC/DAC 论文指标表', '能建立行为级模型', '能判断架构适用场景和主要创新点'],
    projectIdeas: ['做 ADC 架构对比表', '复现一个 SAR ADC behavioral simulator', '整理近十年 ISSCC/JSSC ADC FoM 趋势'],
  },
  {
    slug: 'clocking-pll-timing',
    title: '时钟 / PLL / 频率综合',
    shortTitle: 'Clocking / PLL',
    domain: 'Clocking & Frequency Generation',
    level: 'advanced',
    description: '专门覆盖 PLL、DLL、VCO、DTC、jitter cleaner、clock distribution 和 injection locking，不再混在泛模拟路线里。',
    targetUsers: ['做 PLL/CDR/SerDes 的模拟学生', '关注 clock tree、jitter 和 timing 的 SoC 工程师', '读 ISSCC/JSSC 时钟论文的研究者'],
    prerequisites: ['反馈控制', '相位噪声', '随机过程', 'LC/环振荡器', '采样系统', '版图寄生'],
    stages: [
      {
        id: 'clocking-pll-0',
        title: '阶段 1：相位、频率和噪声',
        goal: '建立 jitter、phase noise、spur、lock range、loop bandwidth 的共同语言。',
        modules: [
          { id: 'pll-noise-language', title: 'Jitter and phase noise', purpose: '把时域抖动和频域相位噪声互相转换。', lessonPlaceholders: ['推导 phase noise 到 rms jitter', '解释 reference spur', '比较 integrated jitter 和 period jitter'], relatedKeywords: ['phase noise', 'jitter', 'spur', 'loop bandwidth'], relatedPaperQueries: ['PLL phase noise jitter spur JSSC'] },
        ],
        checkpoints: ['能读懂 PLL noise plot', '能解释带宽对 jitter/spur 的权衡', '能手算一阶 loop intuition'],
      },
      {
        id: 'clocking-pll-1',
        title: '阶段 2：PLL 和 VCO 架构',
        goal: '理解 CPPLL、ADPLL、MDLL、DPLL、LC VCO、ring VCO、DTC 和 injection locking。',
        modules: [
          { id: 'pll-architecture', title: 'PLL architecture map', purpose: '把模拟、数字和混合 PLL 的优劣势拆开。', lessonPlaceholders: ['比较 CPPLL 和 ADPLL', '解释 DTC resolution', '画 LC VCO noise contributors'], relatedKeywords: ['CPPLL', 'ADPLL', 'DTC', 'LC VCO', 'injection locking'], relatedPaperQueries: ['ADPLL DTC jitter', 'LC VCO phase noise', 'MDLL ISSCC'] },
        ],
        checkpoints: ['能根据应用选择 PLL 架构', '能解释 oscillator FoM', '能判断论文里的主要 jitter bottleneck'],
      },
      {
        id: 'clocking-pll-2',
        title: '阶段 3：系统集成与测量',
        goal: '掌握 clock distribution、supply noise、fractional-N spur、测试仪表和 post-layout 验证。',
        modules: [
          { id: 'clocking-system-test', title: 'Clock integration and measurement', purpose: '把 PLL 从 block 级带到 SoC 时钟系统。', lessonPlaceholders: ['设计 clock jitter budget', '列出 phase-noise 测试流程', '整理 supply pushing 处理方法'], relatedKeywords: ['clock distribution', 'fractional-N spur', 'supply pushing', 'jitter measurement'], relatedPaperQueries: ['fractional N PLL spur cancellation', 'jitter cleaner clock distribution IC'] },
        ],
        checkpoints: ['能写 clocking spec sheet', '能解释测试 setup', '能从论文图里找到系统级约束'],
      },
    ],
    relatedTopics: ['Clocking & Frequency Generation', 'PLL', 'VCO', 'Timing'],
    relatedVenues: ['ISSCC', 'JSSC', 'CICC', 'VLSI Symposium'],
    relatedSearchQueries: ['PLL jitter', 'ADPLL DTC', 'LC VCO phase noise', 'MDLL', 'clock distribution'],
    caveat: 'PLL/clocking 需要控制、噪声和版图同时过关，单看 block diagram 不够。',
    family: 'circuit',
    accent: '#7c3aed',
    subtitle: '时钟路线连接模拟、数字和系统 timing，是 SerDes、RF、ADC 和 SoC 的共同底座。',
    paperQuery: 'PLL OR VCO OR clocking OR frequency synthesizer OR jitter',
    venues: ['ISSCC', 'JSSC', 'CICC'],
    foundation: ['反馈控制', '相位噪声', '随机过程', '振荡器', 'post-layout 仿真'],
    prerequisitesGroups: [
      { title: '数学和信号', note: 'PLL 不是普通放大器。', items: ['Laplace/Z-domain', '噪声积分', '频谱分析', '随机抖动', '环路稳定性'] },
      { title: '电路和版图', note: '噪声常常来自细节。', items: ['charge pump', 'loop filter', 'VCO tank', 'divider', 'DTC', 'supply isolation'] },
    ],
    outcomes: ['能建立 PLL jitter budget', '能读懂 phase noise / spur 图', '能比较 ADPLL、CPPLL、MDLL 的适用场景'],
    projectIdeas: ['做近十年 PLL 架构表', '复现一个 Type-II PLL behavioral model', '整理 oscillator FoM benchmark'],
  },
  {
    slug: 'wireline-serdes',
    title: '高速有线接口 / SerDes',
    shortTitle: 'SerDes / Wireline',
    domain: 'RF/mmWave & Wireline',
    level: 'advanced',
    description: '把 PCIe、Ethernet、HBM/UCIe PHY、equalization、CDR、PAM4/NRZ、jitter budget 和 link modeling 独立成路线。',
    targetUsers: ['做高速接口 PHY 的模拟/混合信号学生', '关注 chiplet / HBM / 数据中心互连的工程师', '想理解 JSSC wireline 论文的人'],
    prerequisites: ['传输线', 'S 参数', '时钟恢复', 'PLL', '采样判决', 'DSP equalization', '封装寄生'],
    stages: [
      {
        id: 'wireline-0',
        title: '阶段 1：信道和眼图',
        goal: '理解 loss、ISI、reflection、crosstalk、eye opening、bathtub curve。',
        modules: [
          { id: 'wireline-channel', title: 'Channel and eye diagram', purpose: '把电磁信道和 receiver margin 连接起来。', lessonPlaceholders: ['解释 insertion loss', '画 NRZ/PAM4 eye', '计算 UI 和 jitter margin'], relatedKeywords: ['eye diagram', 'insertion loss', 'PAM4', 'ISI'], relatedPaperQueries: ['wireline eye diagram PAM4 insertion loss'] },
        ],
        checkpoints: ['能读懂 channel loss 曲线', '能解释 eye mask', '能区分 random/deterministic jitter'],
      },
      {
        id: 'wireline-1',
        title: '阶段 2：TX/RX/CDR 架构',
        goal: '掌握 pre-emphasis、CTLE、DFE、ADC/DSP receiver、CDR、PLL 和 clock forwarding。',
        modules: [
          { id: 'wireline-phy', title: 'PHY architecture', purpose: '拆解一条高速链路里的 TX、RX、equalizer 和 timing recovery。', lessonPlaceholders: ['比较 CTLE/DFE/FIR', '解释 baud-rate CDR', '整理 ADC-based RX'], relatedKeywords: ['CTLE', 'DFE', 'CDR', 'PAM4 receiver', 'clock forwarding'], relatedPaperQueries: ['PAM4 wireline receiver DFE CDR JSSC'] },
        ],
        checkpoints: ['能画出一条 SerDes block diagram', '能判断瓶颈在信道/时钟/噪声/功耗哪里', '能读懂 link budget'],
      },
      {
        id: 'wireline-2',
        title: '阶段 3：封装、标准和系统',
        goal: '把 SerDes 放进 PCIe/CXL/Ethernet/UCIe/HBM 等真实系统约束。',
        modules: [
          { id: 'wireline-standards', title: 'Standards and packaging', purpose: '理解速率、BER、功耗/bit、reach 和封装之间的交易。', lessonPlaceholders: ['列出 PCIe/CXL/UCIe 指标', '比较 short-reach / long-reach', '整理 energy/bit benchmark'], relatedKeywords: ['PCIe', 'CXL', 'UCIe', 'HBM PHY', 'energy per bit'], relatedPaperQueries: ['UCIe PHY wireline', 'HBM PHY SerDes', 'CXL PCIe receiver IC'] },
        ],
        checkpoints: ['能读 standards table', '能比较不同 reach 的 PHY 架构', '能做 energy/bit 趋势表'],
      },
    ],
    relatedTopics: ['RF/mmWave & Wireline', 'SerDes', 'Chiplet', 'High-speed I/O'],
    relatedVenues: ['ISSCC', 'JSSC', 'VLSI Symposium', 'CICC'],
    relatedSearchQueries: ['SerDes', 'wireline receiver', 'PAM4 CDR', 'PCIe PHY', 'UCIe PHY'],
    caveat: 'SerDes 需要电路、信道、封装和标准一起看，不能只学一个 RX block。',
    family: 'circuit',
    accent: '#0891b2',
    subtitle: '高速有线接口是 AI 数据中心、chiplet 和 SoC I/O 的关键路线。',
    paperQuery: 'SerDes OR wireline OR PAM4 OR CDR OR PCIe PHY OR UCIe',
    venues: ['ISSCC', 'JSSC', 'VLSI Symposium'],
    foundation: ['传输线', 'PLL/CDR', 'equalization', 'S 参数', '封装 SI/PI'],
    prerequisitesGroups: [
      { title: '信道基础', note: 'SerDes 先看 channel。', items: ['传输线', 'S 参数', '插入损耗', '串扰', '封装/板级寄生'] },
      { title: '电路基础', note: '高速 PHY 是模拟和数字的混合体。', items: ['高速比较器', 'CTLE', 'DFE', 'CDR', 'PLL', 'ADC-based RX'] },
    ],
    outcomes: ['能读懂 SerDes link budget', '能比较 NRZ/PAM4 架构', '能把论文指标和标准约束对应起来'],
    projectIdeas: ['做 PCIe/CXL/UCIe PHY 指标表', '复现一个 channel + equalizer model', '整理 wireline energy/bit 趋势'],
  },
  {
    slug: 'image-sensor-display',
    title: '图像传感器 / 显示驱动 IC',
    shortTitle: 'CIS / Display IC',
    domain: 'Biomedical & Sensor Interfaces',
    level: 'intermediate',
    description: '覆盖 CMOS image sensor、ToF、SPAD、pixel readout、column ADC、display driver、touch/display integration，是传感接口的重要工业分支。',
    targetUsers: ['对摄像头/显示/传感器芯片感兴趣的学生', '做 AFE/ADC 但想进入成像系统的人', '关注手机/车载/ARVR sensing 的工程师'],
    prerequisites: ['半导体器件', '噪声和暗电流', 'ADC', '低噪声读出', '图像信号基础', '版图寄生'],
    stages: [
      {
        id: 'cis-0',
        title: '阶段 1：像素和读出链',
        goal: '理解 pinned photodiode、source follower、rolling/global shutter、noise、dynamic range。',
        modules: [
          { id: 'pixel-readout', title: 'Pixel and column readout', purpose: '把光电转换、像素电路和 column-parallel ADC 连接起来。', lessonPlaceholders: ['画 4T pixel', '解释 CDS', '比较 rolling/global shutter'], relatedKeywords: ['CMOS image sensor', '4T pixel', 'CDS', 'column ADC'], relatedPaperQueries: ['CMOS image sensor column ADC low noise'] },
        ],
        checkpoints: ['能解释 pixel noise', '能读懂 CIS block diagram', '能比较 global shutter 代价'],
      },
      {
        id: 'cis-1',
        title: '阶段 2：成像指标和系统',
        goal: '掌握 dynamic range、SNR、QE、dark current、frame rate、HDR、ToF/SPAD 指标。',
        modules: [
          { id: 'image-sensor-metrics', title: 'Imaging metrics', purpose: '把电路指标和图像质量联系起来。', lessonPlaceholders: ['整理 HDR 方法', '比较 ToF/SPAD 读出', '解释 dark current'], relatedKeywords: ['HDR image sensor', 'SPAD', 'ToF sensor', 'dynamic range'], relatedPaperQueries: ['HDR CMOS image sensor ISSCC', 'SPAD ToF image sensor JSSC'] },
        ],
        checkpoints: ['能读懂 CIS datasheet', '能判断 HDR 架构创新点', '能分清像素/ADC/ISP 责任边界'],
      },
      {
        id: 'cis-2',
        title: '阶段 3：显示和人机接口',
        goal: '理解 OLED/µLED driver、touch readout、display timing、power and reliability。',
        modules: [
          { id: 'display-driver', title: 'Display driver and touch IC', purpose: '覆盖 DDI、触控AFE和显示系统约束。', lessonPlaceholders: ['比较 AMOLED/µLED driver', '画 touch sensing AFE', '整理显示 IC 功耗和可靠性'], relatedKeywords: ['display driver IC', 'touch controller', 'AMOLED driver', 'microLED'], relatedPaperQueries: ['display driver IC AMOLED touch sensing'] },
        ],
        checkpoints: ['能理解 DDI 系统框图', '能把触控/显示/电源约束分开', '能建立行业公司和论文方向列表'],
      },
    ],
    relatedTopics: ['Biomedical & Sensor Interfaces', 'Image Sensor', 'Display IC'],
    relatedVenues: ['ISSCC', 'JSSC', 'VLSI Symposium', 'Sensors Journal', 'IEDM'],
    relatedSearchQueries: ['CMOS image sensor', 'SPAD ToF', 'display driver IC', 'touch sensing IC'],
    caveat: '图像/显示路线有强工业属性，论文、datasheet 和产品 teardown 要一起看。',
    family: 'circuit',
    accent: '#db2777',
    subtitle: '从像素到读出链，从 column ADC 到显示驱动，是“真实世界接口”里很重要但常被忽略的分支。',
    paperQuery: 'CMOS image sensor OR SPAD OR ToF OR display driver IC OR touch sensing',
    venues: ['ISSCC', 'JSSC', 'VLSI Symposium', 'IEDM'],
    foundation: ['器件物理', 'ADC', '低噪声 AFE', '图像系统', '版图和工艺'],
    prerequisitesGroups: [
      { title: '器件和传感', note: '成像先理解光电转换。', items: ['photodiode', '暗电流', 'shot noise', 'source follower', 'CDS'] },
      { title: '系统和接口', note: '读出链和系统指标强相关。', items: ['column ADC', 'HDR', 'frame timing', 'MIPI', 'display driver'] },
    ],
    outcomes: ['能读懂 CIS / DDI 论文指标', '能拆解像素-读出-系统边界', '能建立传感接口产业地图'],
    projectIdeas: ['做 CIS 指标表', '整理 SPAD/ToF 论文清单', '画 AMOLED display driver 系统图'],
  },
  {
    slug: 'analog-layout-verification',
    title: '模拟版图 / PEX / 物理验证',
    shortTitle: 'Analog Layout',
    domain: 'EDA, CAD & Verification',
    level: 'intermediate',
    description: '把 matching、common-centroid、guard ring、DRC/LVS、PEX、EM/IR、reliability、layout-dependent effects 独立成工程路线。',
    targetUsers: ['模拟版图入门者', '做电路但 post-layout 经常崩的人', '想把论文电路落地 tapeout 的学生'],
    prerequisites: ['CMOS 器件结构', '模拟基本模块', '版图设计规则', '寄生电容电阻', 'Cadence Virtuoso'],
    stages: [
      {
        id: 'analog-layout-0',
        title: '阶段 1：版图基本功',
        goal: '理解 matching、寄生、隔离、ESD、well/substrate 和设计规则。',
        modules: [
          { id: 'layout-matching', title: 'Matching and parasitics', purpose: '把 schematic 的理想关系转换成 layout 约束。', lessonPlaceholders: ['画 common-centroid 电容阵列', '比较 finger device', '解释 guard ring'], relatedKeywords: ['analog layout matching', 'common centroid', 'guard ring'], relatedPaperQueries: ['analog layout matching common centroid'] },
        ],
        checkpoints: ['能画电流镜/差分对版图策略', '能解释 dummy 和 common centroid', '能读 DRC/LVS error'],
      },
      {
        id: 'analog-layout-1',
        title: '阶段 2：PEX 和可靠性',
        goal: '掌握寄生提取、post-layout 仿真、EM/IR、ESD、latch-up、LDE。',
        modules: [
          { id: 'pex-reliability', title: 'PEX and reliability', purpose: '理解为什么 pre-layout 过了不代表能上硅。', lessonPlaceholders: ['比较 schematic vs PEX', '解释 EM current limit', '整理 LDE effects'], relatedKeywords: ['parasitic extraction', 'EM IR', 'layout dependent effect', 'ESD'], relatedPaperQueries: ['post layout analog IC parasitic extraction reliability'] },
        ],
        checkpoints: ['能定位 PEX 后性能下降', '能列出 signoff checklist', '能理解 EM/IR waiver 风险'],
      },
      {
        id: 'analog-layout-2',
        title: '阶段 3：版图自动化和团队协作',
        goal: '理解 layout template、constraint-driven layout、版图自动生成和 schematic/layout 协同。',
        modules: [
          { id: 'layout-automation', title: 'Layout automation', purpose: '连接模拟工程和 EDA 研究。', lessonPlaceholders: ['整理 analog layout automation 论文', '设计 constraint schema', '比较 generator 和 manual layout'], relatedKeywords: ['analog layout automation', 'constraint driven layout', 'layout generator'], relatedPaperQueries: ['analog layout automation DAC ICCAD'] },
        ],
        checkpoints: ['能写版图约束说明', '能评估自动布局论文是否实用', '能建立 tapeout checklist'],
      },
    ],
    relatedTopics: ['EDA, CAD & Verification', 'Analog & Mixed-Signal', 'Physical Verification'],
    relatedVenues: ['DAC', 'ICCAD', 'ISSCC', 'JSSC'],
    relatedSearchQueries: ['analog layout', 'parasitic extraction', 'analog layout automation', 'physical verification'],
    caveat: '模拟版图路线强依赖 PDK 和工具，公开资料只能给方法论，真实能力来自项目。',
    family: 'cad-security',
    accent: '#0f766e',
    subtitle: '版图是模拟 IC 从论文到硅片的分水岭，很多失败不是电路不会，而是物理实现没过关。',
    paperQuery: 'analog layout OR parasitic extraction OR layout automation OR physical verification',
    venues: ['DAC', 'ICCAD', 'JSSC', 'ISSCC'],
    foundation: ['器件结构', '版图规则', '寄生参数', 'DRC/LVS/PEX', 'Virtuoso'],
    prerequisitesGroups: [
      { title: '版图语言', note: '先知道物理实现怎么影响电路。', items: ['matching', 'common centroid', 'dummy', 'guard ring', 'well/substrate'] },
      { title: '验证语言', note: 'tapeout 前必须过的关。', items: ['DRC', 'LVS', 'PEX', 'EM/IR', 'ESD', 'reliability'] },
    ],
    outcomes: ['能做基础模拟版图策略', '能定位 post-layout 问题', '能理解自动版图研究问题'],
    projectIdeas: ['做 ADC CDAC layout checklist', '整理 PEX failure case', '做 analog layout automation 论文分类'],
  },
  {
    slug: 'digital-backend-physical-design',
    title: '数字后端 / Physical Design / Signoff',
    shortTitle: 'Digital Backend',
    domain: 'EDA, CAD & Verification',
    level: 'intermediate',
    description: '从 RTL 到 GDS：综合、floorplan、place、CTS、route、STA、IR/EM、timing ECO、signoff，是数字芯片工程落地核心。',
    targetUsers: ['数字 IC 学生', '想进入后端/STA/PD 的工程师', '做 SoC 但不了解 physical constraints 的人'],
    prerequisites: ['数字逻辑', 'Verilog/SystemVerilog', '时序分析', 'Linux/Tcl', 'EDA flow', '基本工艺/库概念'],
    stages: [
      {
        id: 'backend-0',
        title: '阶段 1：从 RTL 到 netlist',
        goal: '理解 synthesis、constraints、library、clock、setup/hold。',
        modules: [
          { id: 'synthesis-sta', title: 'Synthesis and STA basics', purpose: '把 RTL 功能约束成时序可实现的 netlist。', lessonPlaceholders: ['写 SDC', '解释 setup/hold', '比较 area/power/timing tradeoff'], relatedKeywords: ['logic synthesis', 'STA', 'SDC', 'timing closure'], relatedPaperQueries: ['logic synthesis timing closure VLSI CAD'] },
        ],
        checkpoints: ['能读 timing report', '能解释 false/multicycle path', '能跑一个开源 synthesis flow'],
      },
      {
        id: 'backend-1',
        title: '阶段 2：布局布线和时钟树',
        goal: '掌握 floorplan、placement、CTS、routing、congestion、clock skew。',
        modules: [
          { id: 'place-route-cts', title: 'Place, route, CTS', purpose: '把逻辑网表变成物理版图并控制 timing/power/congestion。', lessonPlaceholders: ['画 floorplan', '解释 congestion map', '比较 CTS skew/latency'], relatedKeywords: ['placement', 'routing', 'CTS', 'congestion', 'clock skew'], relatedPaperQueries: ['placement routing CTS congestion ICCAD DAC'] },
        ],
        checkpoints: ['能解释 floorplan 决策', '能读 congestion/DRC 报告', '能理解 clock tree tradeoff'],
      },
      {
        id: 'backend-2',
        title: '阶段 3：Signoff 和 ECO',
        goal: '掌握 STA signoff、IR drop、EM、SI、power intent、timing ECO 和 tapeout checklist。',
        modules: [
          { id: 'signoff-eco', title: 'Signoff and ECO', purpose: '理解交付 GDS 前的最后质量门槛。', lessonPlaceholders: ['整理 signoff checklist', '解释 IR drop', '做 timing ECO case study'], relatedKeywords: ['signoff', 'ECO', 'IR drop', 'EM', 'power intent'], relatedPaperQueries: ['timing ECO signoff IR drop physical design'] },
        ],
        checkpoints: ['能列 tapeout signoff 项', '能解释 ECO 风险', '能区分 PD/STA/DFT/verification 责任'],
      },
    ],
    relatedTopics: ['EDA, CAD & Verification', 'Digital IC & Architecture', 'Physical Design'],
    relatedVenues: ['DAC', 'ICCAD', 'DATE', 'ISPD'],
    relatedSearchQueries: ['physical design', 'timing closure', 'placement routing', 'clock tree synthesis', 'signoff ECO'],
    caveat: '数字后端路线高度工具链相关，开源 flow 可入门，工业 signoff 仍需真实项目。',
    family: 'digital-system',
    accent: '#ea580c',
    subtitle: '数字后端是从 RTL 到 GDS 的工程主线，决定芯片是否真的能 tapeout。',
    paperQuery: 'physical design OR placement OR routing OR timing closure OR signoff',
    venues: ['DAC', 'ICCAD', 'ISPD', 'DATE'],
    foundation: ['数字逻辑', 'STA', 'Tcl/Linux', 'EDA flow', '标准单元库'],
    prerequisitesGroups: [
      { title: '前端到后端接口', note: '读懂 RTL、约束和库。', items: ['Verilog', 'SDC', 'Liberty', 'LEF/DEF', 'UPF'] },
      { title: '物理实现', note: '后端核心问题。', items: ['floorplan', 'placement', 'CTS', 'routing', 'STA', 'IR/EM'] },
    ],
    outcomes: ['能跑通 RTL-to-GDS mini flow', '能读 timing/congestion/report', '能理解 signoff 质量门槛'],
    projectIdeas: ['跑 OpenROAD AES flow', '做 STA report 注释本', '整理 PD/STA/DFT 职责地图'],
  },
  {
    slug: 'manufacturing-equipment-materials',
    title: '半导体制造 / 设备 / 材料',
    shortTitle: 'Fab Equipment',
    domain: 'Device & Manufacturing',
    level: 'intermediate',
    description: '补足原来器件工艺路线里偏少的 fab 视角：光刻、刻蚀、沉积、CMP、量测、良率、材料和工艺集成。',
    targetUsers: ['想进晶圆厂/设备/材料方向的学生', '做器件工艺但不了解产线的人', '关注供应链和制造能力的人'],
    prerequisites: ['半导体物理', '化学/材料基础', '工艺流程', '统计良率', '洁净室和设备概念'],
    stages: [
      {
        id: 'manufacturing-0',
        title: '阶段 1：工艺单元',
        goal: '理解 lithography、etch、deposition、implant、CMP、metrology 的作用。',
        modules: [
          { id: 'process-modules', title: 'Process module map', purpose: '建立晶圆制造的单元流程图。', lessonPlaceholders: ['画 CMOS process flow', '解释 EUV/DUV 差异', '整理 etch/deposition 指标'], relatedKeywords: ['lithography', 'etch', 'deposition', 'CMP', 'metrology'], relatedPaperQueries: ['semiconductor process lithography etch deposition metrology'] },
        ],
        checkpoints: ['能说清主要设备类别', '能读懂 process flow', '能理解 critical dimension 和 overlay'],
      },
      {
        id: 'manufacturing-1',
        title: '阶段 2：工艺集成和良率',
        goal: '理解 defect density、yield learning、process window、variation、reliability。',
        modules: [
          { id: 'yield-integration', title: 'Yield and integration', purpose: '把单步工艺连接成可量产的整合流程。', lessonPlaceholders: ['计算良率模型', '解释 process window', '整理 defect inspection'], relatedKeywords: ['yield', 'process integration', 'defect density', 'variation'], relatedPaperQueries: ['semiconductor yield process integration defect metrology'] },
        ],
        checkpoints: ['能解释良率爬坡', '能区分设备问题和整合问题', '能读懂 IEDM/IRDS 工艺趋势'],
      },
      {
        id: 'manufacturing-2',
        title: '阶段 3：材料、设备和供应链',
        goal: '理解 photoresist、wafer、precursor、gas、target、tool ecosystem 和国产替代边界。',
        modules: [
          { id: 'materials-equipment', title: 'Materials and equipment ecosystem', purpose: '把技术路线和供应链公司对应起来。', lessonPlaceholders: ['整理 ASML/AMAT/Lam/KLA/TEL 职责', '列材料关键品类', '做国产设备路线图'], relatedKeywords: ['semiconductor equipment', 'materials', 'photoresist', 'wafer', 'metrology'], relatedPaperQueries: ['semiconductor equipment materials lithography metrology'] },
        ],
        checkpoints: ['能画制造供应链地图', '能判断设备/材料瓶颈', '能把公司情报和技术路线连接'],
      },
    ],
    relatedTopics: ['Device & Manufacturing', 'Equipment', 'Materials', 'Process Integration'],
    relatedVenues: ['IEDM', 'VLSI Symposium', 'IRPS', 'SPIE Advanced Lithography'],
    relatedSearchQueries: ['semiconductor equipment', 'lithography', 'etch deposition', 'process integration', 'yield metrology'],
    caveat: '制造/设备/材料路线论文以外还要看白皮书、设备公司资料和产线实践。',
    family: 'device-manufacturing',
    accent: '#64748b',
    subtitle: '要完整理解 IC 产业，制造、设备和材料必须和设计路线并列。',
    paperQuery: 'semiconductor manufacturing OR equipment OR lithography OR etch OR deposition OR metrology',
    venues: ['IEDM', 'VLSI Symposium', 'IRPS'],
    foundation: ['半导体物理', '材料化学', '统计良率', '工艺流程', '供应链地图'],
    prerequisitesGroups: [
      { title: '工艺单元', note: '先理解每台设备在干什么。', items: ['lithography', 'etch', 'deposition', 'implant', 'CMP', 'metrology'] },
      { title: '量产语言', note: '产线不是论文单点指标。', items: ['yield', 'defect density', 'process window', 'SPC', 'reliability'] },
    ],
    outcomes: ['能理解晶圆制造流程', '能连接设备材料公司和工艺任务', '能判断制造路线的技术壁垒'],
    projectIdeas: ['做设备公司-工艺模块矩阵', '整理先进节点关键工艺', '画一张 IC 制造供应链地图'],
  },
  {
    slug: 'automotive-reliability-safety',
    title: '车规芯片 / 可靠性 / 功能安全',
    shortTitle: 'Automotive IC',
    domain: 'General IC',
    level: 'intermediate',
    description: '覆盖 AEC-Q100、ISO 26262、ASIL、EMC/ESD、lifetime、fault injection、redundancy、safety mechanism，是工业化芯片必须补的路线。',
    targetUsers: ['想做车规芯片的学生', '做电源/传感/MCU/SoC 但不了解功能安全的人', '关注芯片产品化和可靠性的工程师'],
    prerequisites: ['基础电路', '数字系统', '半导体可靠性', '测试和验证', '安全工程基本概念'],
    stages: [
      {
        id: 'auto-0',
        title: '阶段 1：车规和可靠性语言',
        goal: '理解 AEC-Q100、HTOL、ESD、latch-up、EMC、lifetime、FIT。',
        modules: [
          { id: 'reliability-language', title: 'Reliability language', purpose: '建立车规芯片的质量和可靠性指标。', lessonPlaceholders: ['整理 AEC-Q100 测试项', '解释 FIT/lifetime', '比较 ESD/latch-up'], relatedKeywords: ['AEC-Q100', 'HTOL', 'ESD', 'latch-up', 'FIT'], relatedPaperQueries: ['automotive IC reliability AEC-Q100 ESD latch-up'] },
        ],
        checkpoints: ['能读懂 reliability qualification 表', '能解释车规与消费级差异', '能列可靠性风险'],
      },
      {
        id: 'auto-1',
        title: '阶段 2：功能安全和诊断',
        goal: '掌握 ISO 26262、ASIL、fault model、diagnostic coverage、redundancy、lockstep。',
        modules: [
          { id: 'functional-safety', title: 'Functional safety', purpose: '把系统安全目标拆到芯片机制。', lessonPlaceholders: ['解释 ASIL', '画 fault tree', '整理 lockstep/ECC/BIST'], relatedKeywords: ['ISO 26262', 'ASIL', 'fault injection', 'diagnostic coverage'], relatedPaperQueries: ['functional safety IC fault injection ISO 26262'] },
        ],
        checkpoints: ['能理解 safety manual', '能解释 diagnostic coverage', '能把安全机制映射到电路/架构'],
      },
      {
        id: 'auto-2',
        title: '阶段 3：应用系统',
        goal: '把可靠性放到 BMS、雷达、MCU、PMIC、传感器和域控制器里看。',
        modules: [
          { id: 'automotive-applications', title: 'Automotive applications', purpose: '连接具体车规芯片产品线和技术约束。', lessonPlaceholders: ['整理 BMS/PMIC 安全机制', '比较 radar/MCU/SoC 可靠性要求', '建立企业产品地图'], relatedKeywords: ['BMS', 'automotive radar', 'safety PMIC', 'MCU', 'domain controller'], relatedPaperQueries: ['automotive PMIC BMS radar IC functional safety'] },
        ],
        checkpoints: ['能建立车规芯片分类表', '能判断产品功能安全要求', '能连接公司情报和学习路线'],
      },
    ],
    relatedTopics: ['General IC', 'Power Management', 'RF/mmWave & Wireline', 'Digital IC & Architecture'],
    relatedVenues: ['ISSCC', 'JSSC', 'IRPS', 'ITC', 'VLSI Symposium'],
    relatedSearchQueries: ['automotive IC', 'functional safety', 'BMS IC', 'automotive radar', 'safety PMIC'],
    caveat: '车规路线标准和公司实践比公开论文更重要，路线内容只能作为技术地图。',
    family: 'cad-security',
    accent: '#16a34a',
    subtitle: '商业化芯片不能只看性能，车规和可靠性决定能不能进入真实高价值市场。',
    paperQuery: 'automotive IC OR functional safety OR BMS IC OR automotive radar OR safety PMIC',
    venues: ['ISSCC', 'JSSC', 'IRPS', 'ITC'],
    foundation: ['可靠性', '测试', '功能安全', '系统工程', '车规标准'],
    prerequisitesGroups: [
      { title: '可靠性', note: '先懂质量语言。', items: ['AEC-Q100', 'HTOL', 'ESD', 'latch-up', 'FIT', 'EMC'] },
      { title: '安全机制', note: '从系统目标落到芯片机制。', items: ['ISO 26262', 'ASIL', 'ECC', 'BIST', 'lockstep', 'fault injection'] },
    ],
    outcomes: ['能读懂车规芯片可靠性要求', '能拆解功能安全机制', '能把 BMS/radar/MCU/PMIC 放入同一地图'],
    projectIdeas: ['做车规芯片标准速查表', '整理安全 PMIC/BMS 论文', '画 automotive semiconductor company map'],
  },
];

export const routeFamilies: RouteFamilySeed[] = [
  {
    id: 'circuit',
    title: '电路设计路线',
    description: '模拟、混合信号、射频、电源、传感接口，是最贴近晶体管和真实信号的 IC 路线。',
    routeIds: ['analog-mixed-signal', 'data-converters', 'clocking-pll-timing', 'wireline-serdes', 'rf-mmwave', 'power-management', 'bio-sensor-mems', 'image-sensor-display'],
  },
  {
    id: 'digital-system',
    title: '数字系统路线',
    description: 'RTL、验证、SoC、处理器、AI 加速器、FPGA，把算法和系统架构变成硬件。',
    routeIds: ['digital-asic', 'digital-backend-physical-design', 'verification-dft', 'architecture-accelerator', 'fpga-reconfigurable'],
  },
  {
    id: 'device-manufacturing',
    title: '器件制造路线',
    description: '器件、工艺、功率半导体、先进封装，是理解芯片物理边界和系统集成的底层路线。',
    routeIds: ['devices-process', 'manufacturing-equipment-materials', 'power-devices', 'advanced-packaging'],
  },
  {
    id: 'cad-security',
    title: '工具与可信路线',
    description: 'EDA、硬件安全、可靠性和测试，连接研究算法、工业流程与可信交付。',
    routeIds: ['analog-layout-verification', 'eda-tools', 'hardware-security', 'automotive-reliability-safety'],
  },
  {
    id: 'frontier',
    title: '交叉前沿路线',
    description: '存算、硅光、量子、类脑等方向不一定适合第一站，但值得作为长期视野。',
    routeIds: ['memory-cim', 'silicon-photonics', 'quantum-neuromorphic'],
  },
];

export const commonFoundations: FoundationGroupSeed[] = [
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
];

export const learningSource = {
  name: 'Crys-Chen/ic-guide',
  url: 'https://github.com/Crys-Chen/ic-guide',
  note: '路线结构参考 Crys-Chen/ic-guide 的通用学习地图与科研方向导览；已过滤复旦课程表、FDU 课程页和复旦定向人员条目。',
};

const rawLessons: Array<[string, string, string, string, LessonLevel, number, string[], string[], string[]]> = [
  ["mos-small-signal", "MOS small-signal model", "analog-mixed-signal", "mos-small-signal", "starter", 18, ["Analog & Mixed-Signal"], ["MOS small signal analog IC"], ["JSSC", "TCAS-I"]],
  ["current-mirror-accuracy", "Current mirror accuracy", "analog-mixed-signal", "bias-mirrors", "core", 18, ["Analog & Mixed-Signal"], ["current mirror accuracy mismatch"], ["JSSC", "CICC"]],
  ["differential-pair-intuition", "Differential pair intuition", "analog-mixed-signal", "diff-feedback", "core", 20, ["Analog & Mixed-Signal"], ["differential pair active load"], ["JSSC", "ISSCC"]],
  ["ldo-loop-stability", "LDO loop stability", "power-management", "ldo", "core", 22, ["Power Management"], ["LDO loop stability", "LDO load transient PSRR"], ["ISSCC", "JSSC", "CICC"]],
  ["switched-capacitor-charge-sharing", "Switched-capacitor charge sharing", "power-management", "sc-hybrid", "core", 20, ["Power Management"], ["switched-capacitor converter charge sharing"], ["ISSCC", "JSSC"]],
  ["sar-adc-binary-search", "SAR ADC binary search", "analog-mixed-signal", "comp-cdac", "starter", 18, ["Analog & Mixed-Signal"], ["SAR ADC binary search capacitor DAC"], ["ISSCC", "JSSC"]],
  ["delta-sigma-noise-shaping", "Delta-sigma noise shaping", "analog-mixed-signal", "ds-ti", "advanced", 24, ["Analog & Mixed-Signal"], ["delta sigma ADC noise shaping"], ["JSSC", "ISSCC"]],
  ["pll-loop-bandwidth", "PLL loop bandwidth", "analog-mixed-signal", "loop", "core", 20, ["Clocking & Frequency Generation"], ["PLL loop bandwidth jitter"], ["ISSCC", "JSSC"]],
  ["phase-noise-intuition", "Phase noise intuition", "analog-mixed-signal", "vco", "core", 22, ["Clocking & Frequency Generation"], ["LC oscillator phase noise"], ["ISSCC", "JSSC"]],
  ["noise-figure", "Noise figure", "rf-mmwave", "rf-metrics", "starter", 18, ["RF/mmWave & Wireline"], ["RF noise figure LNA"], ["RFIC", "JSSC"]],
  ["mmwave-phased-array", "mmWave phased array", "rf-mmwave", "array", "advanced", 25, ["RF/mmWave & Wireline"], ["mmWave phased array beamforming IC"], ["ISSCC", "JSSC", "RFIC"]],
  ["eye-diagram", "Eye diagram", "analog-mixed-signal", "channel", "starter", 16, ["RF/mmWave & Wireline"], ["wireline eye diagram SerDes"], ["ISSCC", "JSSC"]],
  ["clock-data-recovery", "Clock and data recovery", "analog-mixed-signal", "cdr", "core", 22, ["RF/mmWave & Wireline"], ["clock data recovery SerDes"], ["ISSCC", "JSSC"]],
  ["sram-read-stability", "6T SRAM read stability", "memory-cim", "sram", "core", 20, ["Memory & Compute-in-Memory"], ["6T SRAM read stability"], ["ISSCC", "JSSC", "VLSI Symposium"]],
  ["analog-cim", "Analog compute-in-memory", "memory-cim", "cim", "research-frontier", 25, ["Memory & Compute-in-Memory"], ["analog compute in memory macro"], ["ISSCC", "JSSC"]],
  ["analog-sizing-automation", "Analog sizing automation", "eda-tools", "sizing", "research-frontier", 24, ["EDA, CAD & Verification"], ["analog circuit sizing Bayesian optimization"], ["DAC", "ICCAD"]],
  ["llm-for-eda-scripting", "LLM for EDA scripting", "eda-tools", "llm", "research-frontier", 20, ["EDA, CAD & Verification"], ["LLM EDA scripting"], ["DAC", "ICCAD"]],
  ["systolic-array", "Systolic array", "digital-asic", "accelerator", "core", 20, ["Digital IC & Architecture"], ["AI accelerator systolic array"], ["ISSCC", "ISCA", "MICRO"]],
  ["chiplet-interface", "Chiplet interface", "digital-asic", "chiplet", "advanced", 22, ["Digital IC & Architecture"], ["chiplet interface architecture"], ["ISSCC", "VLSI Symposium"]],
  ["adc-fom-reading", "Reading ADC FoM correctly", "data-converters", "adc-metrics", "paper-reading", 20, ["Analog & Mixed-Signal", "ADC"], ["ADC FoM ENOB SNDR Walden Schreier"], ["ISSCC", "JSSC"]],
  ["pipeline-adc-residue", "Pipeline ADC residue amplification", "data-converters", "adc-architectures", "advanced", 24, ["Analog & Mixed-Signal", "ADC"], ["pipeline ADC residue amplifier calibration"], ["JSSC", "VLSI Symposium"]],
  ["ti-adc-skew", "Time-interleaved ADC timing skew", "data-converters", "adc-calibration-test", "advanced", 22, ["Analog & Mixed-Signal", "ADC"], ["time interleaved ADC skew calibration"], ["ISSCC", "JSSC"]],
  ["pll-phase-noise-to-jitter", "Phase noise to integrated jitter", "clocking-pll-timing", "pll-noise-language", "core", 22, ["Clocking & Frequency Generation"], ["PLL phase noise integrated jitter"], ["ISSCC", "JSSC"]],
  ["adpll-dtc-resolution", "ADPLL DTC resolution and spur", "clocking-pll-timing", "pll-architecture", "advanced", 24, ["Clocking & Frequency Generation"], ["ADPLL DTC spur resolution"], ["ISSCC", "JSSC"]],
  ["serdes-eye-and-equalization", "SerDes eye diagram and equalization", "wireline-serdes", "wireline-channel", "starter", 20, ["RF/mmWave & Wireline"], ["SerDes eye diagram CTLE DFE"], ["ISSCC", "JSSC"]],
  ["pam4-cdr-intuition", "PAM4 receiver CDR intuition", "wireline-serdes", "wireline-phy", "advanced", 24, ["RF/mmWave & Wireline"], ["PAM4 receiver CDR wireline"], ["ISSCC", "JSSC"]],
  ["cis-column-adc", "CMOS image sensor column ADC", "image-sensor-display", "pixel-readout", "core", 22, ["Biomedical & Sensor Interfaces"], ["CMOS image sensor column ADC"], ["ISSCC", "JSSC"]],
  ["spad-tof-readout", "SPAD / ToF readout chain", "image-sensor-display", "image-sensor-metrics", "advanced", 24, ["Biomedical & Sensor Interfaces"], ["SPAD ToF image sensor readout"], ["ISSCC", "JSSC"]],
  ["common-centroid-layout", "Common-centroid layout intuition", "analog-layout-verification", "layout-matching", "core", 18, ["Analog & Mixed-Signal", "EDA, CAD & Verification"], ["common centroid analog layout matching"], ["JSSC", "DAC"]],
  ["pex-debug-loop", "Post-layout PEX debug loop", "analog-layout-verification", "pex-reliability", "core", 20, ["Analog & Mixed-Signal", "EDA, CAD & Verification"], ["post layout parasitic extraction analog IC"], ["JSSC", "CICC"]],
  ["sta-setup-hold", "Setup/hold timing report reading", "digital-backend-physical-design", "synthesis-sta", "starter", 20, ["EDA, CAD & Verification", "Digital IC & Architecture"], ["STA setup hold timing report"], ["DAC", "ICCAD"]],
  ["cts-skew-latency", "Clock-tree skew and latency", "digital-backend-physical-design", "place-route-cts", "core", 22, ["EDA, CAD & Verification"], ["clock tree synthesis skew latency"], ["DAC", "ICCAD", "ISPD"]],
  ["process-window-yield", "Process window and yield learning", "manufacturing-equipment-materials", "yield-integration", "core", 22, ["Device & Manufacturing"], ["semiconductor process window yield learning"], ["IEDM", "VLSI Symposium"]],
  ["aecq100-qualification", "AEC-Q100 qualification map", "automotive-reliability-safety", "reliability-language", "starter", 18, ["General IC"], ["AEC-Q100 automotive IC reliability"], ["IRPS", "ITC"]],
  ["asil-diagnostic-coverage", "ASIL and diagnostic coverage", "automotive-reliability-safety", "functional-safety", "core", 22, ["General IC", "Digital IC & Architecture"], ["ISO 26262 diagnostic coverage IC"], ["ITC", "ISSCC"]],
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
