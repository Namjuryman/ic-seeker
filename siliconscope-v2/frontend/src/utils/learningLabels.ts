import type { LessonLevel, RoadmapLevel } from '../types'

const levelLabels: Record<RoadmapLevel, string> = {
  foundation: '基础',
  intermediate: '进阶',
  advanced: '高级',
  research: '研究前沿',
}

const lessonLevelLabels: Record<LessonLevel, string> = {
  starter: '入门',
  core: '核心',
  advanced: '进阶',
  'paper-reading': '论文阅读',
  'research-frontier': '研究前沿',
}

const familyLabels: Record<string, string> = {
  'ic-design': 'IC 设计路线',
  'digital-system': '数字与系统路线',
  'device-manufacturing': '器件与制造路线',
  'tools-quality-security': '工具、质量与安全路线',
  frontier: '前沿交叉路线',
}

const domainLabels: Record<string, string> = {
  'Analog & Mixed-Signal': '模拟 / 数模混合',
  'Clocking & Frequency Generation': '时钟与频率生成',
  'RF/mmWave & Wireline': '射频 / 毫米波 / 高速接口',
  'Power Management': '电源管理',
  'Biomedical, Sensor & Imaging IC': '生物医疗 / 传感 / 成像 IC',
  'Digital IC & Architecture': '数字 IC 与体系结构',
  'EDA, CAD & Verification': 'EDA / CAD / 验证',
  'Memory & Compute-in-Memory': '存储与存内计算',
  'Devices, Process & 3D Integration': '器件 / 工艺 / 3D 集成',
  'Security & Reliability': '安全与可靠性',
  'General IC': '通用 IC',
}

export function formatLearningLevel(level?: RoadmapLevel | string | null) {
  if (!level) return ''
  return levelLabels[level as RoadmapLevel] || String(level)
}

export function formatLessonLevel(level?: LessonLevel | string | null) {
  if (!level) return ''
  return lessonLevelLabels[level as LessonLevel] || String(level)
}

export function formatLearningFamily(family?: string | null) {
  if (!family) return ''
  return familyLabels[family] || family
}

export function formatLearningDomain(domain?: string | null) {
  if (!domain) return ''
  return domainLabels[domain] || domain
}
