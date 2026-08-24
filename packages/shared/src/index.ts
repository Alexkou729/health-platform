/**
 * 健康管理系统共享类型定义
 * 用于前后端共享类型契约
 */

// ============================================
// 基础枚举
// ============================================

export enum Gender {
  UNKNOWN = 0,
  MALE = 1,
  FEMALE = 2,
}

export enum CustomerLevel {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  DIAMOND = 'DIAMOND',
  BLACK = 'BLACK',
}

export enum CustomerTag {
  /** 平和质 */
  BALANCED = 'BALANCED',
  /** 气虚质 */
  QI_DEFICIENCY = 'QI_DEFICIENCY',
  /** 阳虚质 */
  YANG_DEFICIENCY = 'YANG_DEFICIENCY',
  /** 阴虚质 */
  YIN_DEFICIENCY = 'YIN_DEFICIENCY',
  /** 痰湿质 */
  PHLEGM_DAMPNESS = 'PHLEGM_DAMPNESS',
  /** 湿热质 */
  DAMPNESS_HEAT = 'DAMPNESS_HEAT',
  /** 血瘀质 */
  BLOOD_STASIS = 'BLOOD_STASIS',
  /** 气郁质 */
  QI_STAGNATION = 'QI_STAGNATION',
  /** 特禀质 */
  SPECIAL = 'SPECIAL',
}

export enum DeviceStatus {
  OFFLINE = 0,
  ONLINE = 1,
  DETECTING = 2,
  ERROR = 3,
  MAINTENANCE = 4,
}

export enum DetectionStatus {
  PENDING = 0,
  RUNNING = 1,
  COMPLETED = 2,
  FAILED = 3,
  CANCELED = 4,
}

export enum ReportStatus {
  GENERATING = 0,
  READY = 1,
  DELIVERED = 2,
  VIEWED = 3,
  EXPIRED = 4,
}

export enum OrderStatus {
  UNPAID = 0,
  PAID = 1,
  REFUNDED = 2,
  CANCELED = 3,
  COMPLETED = 4,
}

export enum PackageType {
  /** 单次检测 */
  SINGLE = 'SINGLE',
  /** 检测套餐 */
  TIMES = 'TIMES',
  /** 调理套餐 */
  TREATMENT = 'TREATMENT',
  /** 年卡 */
  ANNUAL = 'ANNUAL',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STORE_ADMIN = 'STORE_ADMIN',
  DOCTOR = 'DOCTOR',
  CONSULTANT = 'CONSULTANT',
  RECEPTIONIST = 'RECEPTIONIST',
}

export enum IndicatorStatus {
  NORMAL = 0,
  SLIGHT_HIGH = 1,
  SLIGHT_LOW = 2,
  HIGH = 3,
  LOW = 4,
  CRITICAL = 5,
  UNKNOWN = 6,
}

// ============================================
// 报告模板代码 (43 份原 Quantum Analyzer)
// ============================================

export enum ReportTemplate {
  /** 01 对比分析 */
  COMPARISON = 'comparison',
  /** 02 皮肤 */
  SKIN = 'skin',
  /** 03 前列腺 */
  PROSTATE = 'prostate',
  /** 04 微量元素 */
  TRACE_ELEMENTS = 'trace_elements',
  /** 05 维生素 */
  VITAMINS = 'vitamins',
  /** 06 胃肠功能 */
  GI_FUNCTION = 'gi_function',
  /** 07 血脂 */
  BLOOD_LIPID = 'blood_lipid',
  /** 08 血钙 */
  BLOOD_CALCIUM = 'blood_calcium',
  /** 09 脂肪酸 */
  FATTY_ACID = 'fatty_acid',
  /** 10 专家分析 */
  EXPERT_ANALYSIS = 'expert_analysis',
  /** 11 月经周期 */
  MENSTRUAL = 'menstrual',
  /** 12 疾病风险 */
  DISEASE_RISK = 'disease_risk',
  /** 13 骨气不足 */
  BONE_DEFICIENCY = 'bone_deficiency',
  /** 14 肺功能 */
  LUNG_FUNCTION = 'lung_function',
  /** 15 人体毒素 */
  BODY_TOXIN = 'body_toxin',
  /** 16 重金属 */
  HEAVY_METAL = 'heavy_metal',
  /** 17 内分泌 */
  ENDOCRINE = 'endocrine',
  /** 18 眼部 */
  EYE = 'eye',
  /** 19 综合报告 */
  COMPREHENSIVE = 'comprehensive',
  /** 20 淋巴 */
  LYMPHATIC = 'lymphatic',
  /** 21 类风湿 */
  RHEUMATISM = 'rheumatism',
  /** 22 体液 */
  BODY_FLUID = 'body_fluid',
  /** 23 胶原蛋白 */
  COLLAGEN = 'collagen',
  /** 24 甲状腺 */
  THYROID = 'thyroid',
  /** 25 精子与精液 */
  SPERM_SEMEN = 'sperm_semen',
  /** 26 呼吸功能 */
  RESPIRATORY = 'respiratory',
  /** 27 骨骼密度 */
  BONE_DENSITY = 'bone_density',
  /** 28 心肌功能 */
  CARDIAC_MUSCLE = 'cardiac_muscle',
  /** 29 人体毒素(细分) */
  BODY_TOXIN_DETAIL = 'body_toxin_detail',
  /** 30 人体成分 */
  BODY_COMPOSITION = 'body_composition',
  /** 31 免疫系统 */
  IMMUNE_SYSTEM = 'immune_system',
  /** 32 心脑血管 */
  CARDIOVASCULAR = 'cardiovascular',
  /** 33 皮肤症状 */
  SKIN_SYMPTOM = 'skin_symptom',
  /** 34 基本脂肪酸 */
  EFA = 'efa',
  /** 35 男性性功能 */
  MALE_SEXUAL = 'male_sexual',
  /** 36 人体综合免疫力 */
  COMPREHENSIVE_IMMUNITY = 'comprehensive_immunity',
  /** 37 肠道菌群 */
  GUT_FLORA = 'gut_flora',
  /** 38 人体意识体态 */
  CONSCIOUSNESS_POSTURE = 'consciousness_posture',
  /** 39 益生菌指数 */
  PROBIOTIC_INDEX = 'probiotic_index',
  /** 40 颈椎与脑血管 */
  CERVICAL_VASCULAR = 'cervical_vascular',
  /** 41 过敏 */
  ALLERGY = 'allergy',
  /** 42 呼吸功能 (细分) */
  RESPIRATORY_DETAIL = 'respiratory_detail',
  /** 43 基本体质 */
  BASIC_CONSTITUTION = 'basic_constitution',
}

/** 报告模板元信息 */
export interface ReportTemplateMeta {
  code: ReportTemplate;
  name: string;
  nameEn: string;
  category: string;
  icon: string;
  description: string;
  /** 检测项数 */
  indicatorsCount: number;
  /** 适用人群: all/male/female/elderly/child */
  applicable: ('all' | 'male' | 'female' | 'elderly' | 'child')[];
}

/** 全部 43 份报告模板元数据 */
export const REPORT_TEMPLATES: ReportTemplateMeta[] = [
  { code: ReportTemplate.COMPREHENSIVE, name: '综合报告', nameEn: 'Comprehensive Report', category: '综合', icon: 'Document', description: '全身 9 大系统综合健康评估', indicatorsCount: 200, applicable: ['all'] },
  { code: ReportTemplate.COMPARISON, name: '对比分析报告', nameEn: 'Comparison', category: '综合', icon: 'TrendCharts', description: '多次检测结果对比与趋势分析', indicatorsCount: 0, applicable: ['all'] },
  { code: ReportTemplate.EXPERT_ANALYSIS, name: '专家分析报告', nameEn: 'Expert Analysis', category: '综合', icon: 'UserFilled', description: '结合 AI 的专家级建议', indicatorsCount: 0, applicable: ['all'] },
  { code: ReportTemplate.BASIC_CONSTITUTION, name: '基本体质评估', nameEn: 'Basic Constitution', category: '综合', icon: 'CircleCheck', description: '中医 9 种体质辨识', indicatorsCount: 50, applicable: ['all'] },

  { code: ReportTemplate.CARDIOVASCULAR, name: '心脑血管评估', nameEn: 'Cardiovascular', category: '系统器官', icon: 'Heart', description: '心脏与血管功能评估', indicatorsCount: 32, applicable: ['all', 'elderly'] },
  { code: ReportTemplate.IMMUNE_SYSTEM, name: '免疫系统评估', nameEn: 'Immune System', category: '系统器官', icon: 'Shield', description: '免疫功能与抵抗力评估', indicatorsCount: 28, applicable: ['all'] },
  { code: ReportTemplate.GI_FUNCTION, name: '胃肠功能评估', nameEn: 'GI Function', category: '系统器官', icon: 'Goblet', description: '胃肠消化功能评估', indicatorsCount: 24, applicable: ['all'] },
  { code: ReportTemplate.ENDOCRINE, name: '内分泌系统评估', nameEn: 'Endocrine', category: '系统器官', icon: 'Cpu', description: '内分泌平衡评估', indicatorsCount: 26, applicable: ['all'] },
  { code: ReportTemplate.LUNG_FUNCTION, name: '肺功能评估', nameEn: 'Lung Function', category: '系统器官', icon: 'WindPower', description: '呼吸系统功能评估', indicatorsCount: 18, applicable: ['all'] },
  { code: ReportTemplate.CARDIAC_MUSCLE, name: '心肌功能评估', nameEn: 'Cardiac Muscle', category: '系统器官', icon: 'Cellphone', description: '心肌供血与活力评估', indicatorsCount: 22, applicable: ['all'] },
  { code: ReportTemplate.BONE_DEFICIENCY, name: '骨气不足评估', nameEn: 'Bone Deficiency', category: '系统器官', icon: 'Bone', description: '骨质与骨密度初步评估', indicatorsCount: 16, applicable: ['all', 'elderly'] },
  { code: ReportTemplate.BONE_DENSITY, name: '骨骼密度评估', nameEn: 'Bone Density', category: '系统器官', icon: 'Coin', description: '骨密度评估', indicatorsCount: 14, applicable: ['all', 'elderly'] },
  { code: ReportTemplate.ALLERGY, name: '过敏评估', nameEn: 'Allergy', category: '系统器官', icon: 'WarningFilled', description: '过敏体质与过敏原评估', indicatorsCount: 30, applicable: ['all'] },
  { code: ReportTemplate.RESPIRATORY, name: '呼吸功能评估', nameEn: 'Respiratory', category: '系统器官', icon: 'Sunny', description: '呼吸深度与频率', indicatorsCount: 12, applicable: ['all'] },
  { code: ReportTemplate.RESPIRATORY_DETAIL, name: '呼吸功能(详细)', nameEn: 'Respiratory Detail', category: '系统器官', icon: 'MostlyCloudy', description: '呼吸功能详细评估', indicatorsCount: 16, applicable: ['all'] },
  { code: ReportTemplate.SKIN_SYMPTOM, name: '皮肤症状评估', nameEn: 'Skin Symptoms', category: '系统器官', icon: 'MagicStick', description: '皮肤问题与亚健康', indicatorsCount: 20, applicable: ['all'] },
  { code: ReportTemplate.EYE, name: '眼部评估', nameEn: 'Eye Health', category: '系统器官', icon: 'View', description: '眼疲劳与视力评估', indicatorsCount: 18, applicable: ['all'] },
  { code: ReportTemplate.CERVICAL_VASCULAR, name: '颈椎与脑血管', nameEn: 'Cervical & Vascular', category: '系统器官', icon: 'Connection', description: '颈椎与脑部供血评估', indicatorsCount: 20, applicable: ['all', 'elderly'] },
  { code: ReportTemplate.LYMPHATIC, name: '淋巴评估', nameEn: 'Lymphatic', category: '系统器官', icon: 'Share', description: '淋巴循环与免疫', indicatorsCount: 14, applicable: ['all'] },

  { code: ReportTemplate.TRACE_ELEMENTS, name: '微量元素评估', nameEn: 'Trace Elements', category: '营养', icon: 'Bowl', description: '钙铁锌硒等微量元素', indicatorsCount: 24, applicable: ['all'] },
  { code: ReportTemplate.VITAMINS, name: '维生素评估', nameEn: 'Vitamins', category: '营养', icon: 'Orange', description: '维生素 A/B/C/D/E 等', indicatorsCount: 18, applicable: ['all'] },
  { code: ReportTemplate.BLOOD_LIPID, name: '血脂评估', nameEn: 'Blood Lipid', category: '营养', icon: 'Histogram', description: '胆固醇与甘油三酯', indicatorsCount: 16, applicable: ['all', 'elderly'] },
  { code: ReportTemplate.BLOOD_CALCIUM, name: '血钙评估', nameEn: 'Blood Calcium', category: '营养', icon: 'Sugar', description: '血钙浓度评估', indicatorsCount: 8, applicable: ['all'] },
  { code: ReportTemplate.FATTY_ACID, name: '脂肪酸评估', nameEn: 'Fatty Acid', category: '营养', icon: 'Refrigerator', description: '脂肪酸平衡评估', indicatorsCount: 14, applicable: ['all'] },
  { code: ReportTemplate.EFA, name: '基本脂肪酸评估', nameEn: 'Essential FA', category: '营养', icon: 'Apple', description: '必需脂肪酸指数', indicatorsCount: 12, applicable: ['all'] },

  { code: ReportTemplate.PROSTATE, name: '前列腺评估', nameEn: 'Prostate', category: '男性', icon: 'Male', description: '男性前列腺健康', indicatorsCount: 18, applicable: ['male'] },
  { code: ReportTemplate.SPERM_SEMEN, name: '精子与精液评估', nameEn: 'Sperm & Semen', category: '男性', icon: 'Sunrise', description: '男性生殖健康', indicatorsCount: 20, applicable: ['male'] },
  { code: ReportTemplate.MALE_SEXUAL, name: '男性性功能评估', nameEn: 'Male Sexual', category: '男性', icon: 'FirstAidKit', description: '男性性功能评估', indicatorsCount: 16, applicable: ['male'] },
  { code: ReportTemplate.MENSTRUAL, name: '月经周期评估', nameEn: 'Menstrual Cycle', category: '女性', icon: 'Female', description: '女性月经与内分泌', indicatorsCount: 20, applicable: ['female'] },
  { code: ReportTemplate.PROBIOTIC_INDEX, name: '益生菌指数评估', nameEn: 'Probiotic Index', category: '女性', icon: 'Grape', description: '肠道益生菌平衡', indicatorsCount: 14, applicable: ['female'] },

  { code: ReportTemplate.BODY_TOXIN, name: '人体毒素评估', nameEn: 'Body Toxins', category: '风险', icon: 'Delete', description: '体内毒素水平评估', indicatorsCount: 18, applicable: ['all'] },
  { code: ReportTemplate.BODY_TOXIN_DETAIL, name: '人体毒素(详细)', nameEn: 'Body Toxins Detail', category: '风险', icon: 'BrushFilled', description: '毒素详细分类评估', indicatorsCount: 24, applicable: ['all'] },
  { code: ReportTemplate.HEAVY_METAL, name: '重金属态评估', nameEn: 'Heavy Metals', category: '风险', icon: 'BellFilled', description: '铅汞镉砷等重金属', indicatorsCount: 16, applicable: ['all'] },
  { code: ReportTemplate.DISEASE_RISK, name: '疾病风险评估', nameEn: 'Disease Risk', category: '风险', icon: 'FirstAidKit', description: '疾病风险预测', indicatorsCount: 30, applicable: ['all'] },

  { code: ReportTemplate.BODY_COMPOSITION, name: '人体成分评估', nameEn: 'Body Composition', category: '体成分', icon: 'DataAnalysis', description: '水分、蛋白质、脂肪、肌肉', indicatorsCount: 20, applicable: ['all'] },
  { code: ReportTemplate.BODY_FLUID, name: '体液评估', nameEn: 'Body Fluids', category: '体成分', icon: 'Drizzling', description: '体液平衡评估', indicatorsCount: 12, applicable: ['all'] },
  { code: ReportTemplate.COLLAGEN, name: '胶原蛋白评估', nameEn: 'Collagen', category: '体成分', icon: 'Present', description: '胶原蛋白流失评估', indicatorsCount: 10, applicable: ['female', 'elderly'] },
  { code: ReportTemplate.THYROID, name: '甲状腺评估', nameEn: 'Thyroid', category: '体成分', icon: 'Goblet', description: '甲状腺功能评估', indicatorsCount: 16, applicable: ['all'] },
  { code: ReportTemplate.CONSCIOUSNESS_POSTURE, name: '人体意识体态评估', nameEn: 'Consciousness/Posture', category: '体成分', icon: 'Aim', description: '姿态与心理状态', indicatorsCount: 16, applicable: ['all'] },

  { code: ReportTemplate.SKIN, name: '皮肤评估', nameEn: 'Skin', category: '专项', icon: 'Sunny', description: '皮肤健康与水分', indicatorsCount: 20, applicable: ['all', 'female'] },
  { code: ReportTemplate.RHEUMATISM, name: '类风湿评估', nameEn: 'Rheumatism', category: '专项', icon: 'Cellphone', description: '风湿与类风湿风险', indicatorsCount: 18, applicable: ['all', 'elderly'] },
  { code: ReportTemplate.COMPREHENSIVE_IMMUNITY, name: '人体综合免疫力', nameEn: 'Comprehensive Immunity', category: '专项', icon: 'Shield', description: '综合免疫力评估', indicatorsCount: 24, applicable: ['all'] },
  { code: ReportTemplate.GUT_FLORA, name: '肠道菌群评估', nameEn: 'Gut Flora', category: '专项', icon: 'Bowl', description: '肠道微生态评估', indicatorsCount: 20, applicable: ['all'] },
];

// ============================================
// 数据模型
// ============================================

export interface Customer {
  id: string;
  openid?: string;
  unionid?: string;
  name: string;
  phone: string;
  gender: Gender;
  birthday?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  wechatNickname?: string;
  avatarUrl?: string;
  storeId: string;
  consultantId?: string;
  level: CustomerLevel;
  tags: CustomerTag[];
  totalSpent: number;
  totalDetections: number;
  lastDetectionAt?: string;
  createdAt: string;
  updatedAt: string;
  remark?: string;
}

export interface Store {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  manager: string;
  openHours: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Staff {
  id: string;
  username: string;
  name: string;
  phone: string;
  role: UserRole;
  storeId: string;
  avatarUrl?: string;
  commissionRate: number;
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: string;
  createdAt: string;
}

export interface Device {
  id: string;
  deviceNo: string;
  vendor: string;
  model: string;
  hidVendorId?: number;
  hidProductId?: number;
  status: DeviceStatus;
  lastHeartbeatAt?: string;
  storeId: string;
  boundAt: string;
  expiresAt: string;
  totalDetections: number;
  firmwareVersion: string;
}

export interface Detection {
  id: string;
  customerId: string;
  deviceId: string;
  staffId: string;
  storeId: string;
  startedAt: string;
  finishedAt?: string;
  durationSec: number;
  status: DetectionStatus;
  /** 60 秒原始生物电数据 */
  rawPayload?: RawDetectionPayload;
  /** 综合评分 0-100 */
  overallScore?: number;
  /** 体质类型 */
  constitution?: CustomerTag;
  remark?: string;
}

export interface RawDetectionPayload {
  /** 采样点 */
  samples: number[];
  /** 频率 Hz */
  sampleRate: number;
  /** 总时长 ms */
  durationMs: number;
  /** 各指标实测值 */
  indicators: Record<string, number>;
}

export interface Indicator {
  /** 指标编码 */
  code: string;
  /** 指标名 */
  name: string;
  /** 指标名(英文) */
  nameEn?: string;
  /** 所属报告模板 */
  template: ReportTemplate;
  /** 实测值 */
  value: number;
  /** 单位 */
  unit: string;
  /** 标准下限 */
  lowLimit: number;
  /** 标准上限 */
  highLimit: number;
  /** 参考范围 */
  referenceRange: string;
  /** 状态 */
  status: IndicatorStatus;
  /** 描述 */
  description?: string;
}

export interface Report {
  id: string;
  detectionId: string;
  customerId: string;
  templateCode: ReportTemplate;
  templateVersion: number;
  /** 各项指标结果 */
  indicators: Indicator[];
  /** 综合评分 */
  score: number;
  /** 文字结论 */
  conclusion: string;
  /** 健康建议 */
  suggestions: string[];
  /** PDF 路径 */
  pdfUrl?: string;
  /** H5 路径 */
  htmlUrl?: string;
  status: ReportStatus;
  createdAt: string;
  /** 用于溯源 */
  customer: Pick<Customer, 'id' | 'name' | 'phone'>;
}

export interface Package {
  id: string;
  name: string;
  type: PackageType;
  description: string;
  totalTimes: number;
  remainTimes: number;
  price: number;
  originalPrice: number;
  validityDays: number;
  storeId: string;
  applicableTemplates: ReportTemplate[];
  giftServices: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  packageId: string;
  staffId: string;
  storeId: string;
  amount: number;
  paidAmount: number;
  discount: number;
  status: OrderStatus;
  paymentMethod?: 'WECHAT' | 'CASH' | 'CARD' | 'ALIPAY';
  paidAt?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  type: 'AMOUNT' | 'PERCENTAGE' | 'GIFT';
  value: number;
  minSpend: number;
  validFrom: string;
  validTo: string;
  totalQuantity: number;
  usedQuantity: number;
  status: 'ACTIVE' | 'INACTIVE';
}

// ============================================
// 检测过程实时数据
// ============================================

export interface DetectionProgress {
  detectionId: string;
  /** 0-100 */
  progress: number;
  /** 已采集秒数 */
  elapsedSec: number;
  /** 实时信号强度 */
  signalStrength: number;
  /** 实时心率 */
  heartRate?: number;
  /** 当前阶段 */
  phase: 'CONNECTING' | 'CALIBRATING' | 'COLLECTING' | 'PROCESSING' | 'DONE' | 'ERROR';
  message?: string;
}

// ============================================
// API 响应包装
// ============================================

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================
// 微信相关
// ============================================

export interface WxOAuthSession {
  openid: string;
  unionid?: string;
  nickname?: string;
  headimgurl?: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface WxTemplateMessage {
  templateId: string;
  touser: string;
  data: Record<string, { value: string; color?: string }>;
  url?: string;
  miniprogram?: {
    appid: string;
    pagepath: string;
  };
}

// ============================================
// 设备协议
// ============================================

/** 设备上报心跳包 */
export interface DeviceHeartbeat {
  deviceNo: string;
  timestamp: number;
  status: DeviceStatus;
  firmwareVersion: string;
  temperature?: number;
  totalDetections: number;
}

/** 设备开始检测指令 */
export interface DeviceStartCommand {
  deviceNo: string;
  detectionId: string;
  customerInfo: {
    name: string;
    gender: Gender;
    age: number;
    heightCm?: number;
    weightKg?: number;
  };
  /** 检测持续时间(秒), 默认 60 */
  duration: number;
}

/** 设备上报实时进度 */
export interface DeviceProgressReport {
  deviceNo: string;
  detectionId: string;
  progress: number;
  elapsedSec: number;
  signalStrength: number;
  phase: 'CONNECTING' | 'CALIBRATING' | 'COLLECTING' | 'PROCESSING' | 'DONE' | 'ERROR';
  message?: string;
}

/** 设备检测完成数据包 */
export interface DeviceCompleteData {
  deviceNo: string;
  detectionId: string;
  rawPayload: RawDetectionPayload;
  /** 设备内置算法初步评估 */
  preliminaryScore?: number;
  durationMs: number;
}
