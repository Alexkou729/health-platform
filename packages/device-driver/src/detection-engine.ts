/**
 * Detection Engine for Quantum Analyzer
 * 
 * 将 Rockey 加密狗的响应数据转换为健康指标。
 * 
 * 核心原理:
 * 加密狗的响应是质询-应答数据（非确定性），因此指标生成必须:
 * 1. 以客户信息为种子（确保同一客户结果一致）
 * 2. 结合加密狗响应的哈希（确保不同设备/会话有差异）
 * 3. 在生理合理范围内生成指标（确保结果可信）
 * 
 * 这与原版 Quantum Analyzer 的行为一致:
 * 原版软件也是从加密狗获取加密数据，然后通过内部算法映射为健康指标。
 */

import { createHash } from 'crypto';

// ===== 输入/输出类型 =====

export interface DetectionInput {
  customerName: string;
  gender: 'male' | 'female';
  age: number;
  height: number; // cm
  weight: number; // kg
}

export interface IndicatorValue {
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 单位 */
  unit: string;
  /** 参考范围下限 */
  refLow: number;
  /** 参考范围上限 */
  refHigh: number;
  /** 状态: 0=正常, 1=轻微偏高, 2=轻微偏低, 3=明显偏高, 4=明显偏低 */
  status: number;
  /** 所属模板代码 */
  templateCode?: string;
}

export interface BodyComposition {
  /** 身体水分含量 (L) */
  water: number;
  /** 肌肉量 (kg) */
  muscle: number;
  /** 去脂体重 (kg) */
  leanMass: number;
  /** 蛋白质 (kg) */
  protein: number;
  /** 无机质 (kg) */
  mineral: number;
  /** 体脂肪 (kg) */
  fat: number;
  /** 体重 (kg) */
  weight: number;
  /** BMI */
  bmi: number;
  /** 体脂百分比 */
  bodyFatPercent: number;
  /** 基础代谢 (kcal) */
  bmr: number;
}

export interface DetectionResult {
  /** 检测时间 */
  timestamp: Date;
  /** 设备路径 */
  devicePath: string;
  /** 客户信息 */
  customer: DetectionInput;
  /** 原始加密狗响应 */
  rawResponse: Buffer;
  /** 身体成分分析 */
  bodyComposition: BodyComposition;
  /** 各项指标 */
  indicators: IndicatorValue[];
  /** 综合评分 (0-100) */
  overallScore: number;
}

// ===== 确定性伪随机数生成器 =====

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** 生成 [0, 1) 的伪随机数 */
  next(): number {
    // xorshift32
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 4294967296;
  }

  /** 生成 [min, max) 范围的伪随机数 */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// ===== 检测引擎 =====

export class DetectionEngine {
  /**
   * 执行完整检测
   * @param rawResponse 加密狗原始响应数据
   * @param input 客户信息
   * @param devicePath 设备路径
   */
  performDetection(
    rawResponse: Buffer,
    input: DetectionInput,
    devicePath: string
  ): DetectionResult {
    // 1. 创建种子: 客户信息 + 设备响应哈希
    const seed = this.createSeed(rawResponse, input);
    const rng = new SeededRandom(seed);

    // 2. 生成身体成分（基于客户信息 + 小幅扰动）
    const bodyComposition = this.generateBodyComposition(input, rng);

    // 3. 生成各项指标
    const indicators = this.generateIndicators(input, bodyComposition, rng);

    // 4. 计算综合评分
    const overallScore = this.calculateScore(indicators);

    return {
      timestamp: new Date(),
      devicePath,
      customer: input,
      rawResponse,
      bodyComposition,
      indicators,
      overallScore,
    };
  }

  /**
   * 创建种子
   * 确保: 同一客户 + 同一设备响应 → 相同种子 → 相同指标
   */
  private createSeed(rawResponse: Buffer, input: DetectionInput): number {
    const seedInput = [
      input.customerName,
      input.gender,
      input.age.toString(),
      input.height.toString(),
      input.weight.toString(),
      rawResponse.toString('hex').slice(0, 64), // 取响应的前64字节哈希
    ].join('|');

    const hash = createHash('sha256').update(seedInput).digest();
    // 取前4字节作为种子
    return hash.readUInt32BE(0);
  }

  /**
   * 生成身体成分
   * 基于客户的身高体重计算合理的基础值，然后加小幅扰动
   */
  private generateBodyComposition(
    input: DetectionInput,
    rng: SeededRandom
  ): BodyComposition {
    const { gender, age, height, weight } = input;
    const heightM = height / 100;

    // BMI
    const bmi = weight / (heightM * heightM);

    // 体脂百分比（基于BMI和性别的估算）
    let bodyFatPercent: number;
    if (gender === 'male') {
      bodyFatPercent = 1.2 * bmi + 0.23 * age - 16.2;
    } else {
      bodyFatPercent = 1.2 * bmi + 0.23 * age - 5.4;
    }
    // 加扰动
    bodyFatPercent = Math.max(5, Math.min(50, bodyFatPercent + rng.range(-2, 2)));

    // 体脂肪重量
    const fat = (weight * bodyFatPercent) / 100;

    // 去脂体重
    const leanMass = weight - fat;

    // 身体水分（约为去脂体重的73%）
    const water = leanMass * 0.73 * (1 + rng.range(-0.03, 0.03));

    // 蛋白质（约为去脂体重的20%）
    const protein = leanMass * 0.2 * (1 + rng.range(-0.05, 0.05));

    // 无机质（约为去脂体重的7%）
    const mineral = leanMass * 0.07 * (1 + rng.range(-0.05, 0.05));

    // 肌肉量（约为去脂体重的75%）
    const muscle = leanMass * 0.75 * (1 + rng.range(-0.03, 0.03));

    // 基础代谢（Mifflin-St Jeor公式）
    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    bmr = Math.round(bmr * (1 + rng.range(-0.05, 0.05)));

    return {
      water: Math.round(water * 10) / 10,
      muscle: Math.round(muscle * 10) / 10,
      leanMass: Math.round(leanMass * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      mineral: Math.round(mineral * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      weight,
      bmi: Math.round(bmi * 10) / 10,
      bodyFatPercent: Math.round(bodyFatPercent * 10) / 10,
      bmr,
    };
  }

  /**
   * 生成各项健康指标
   */
  private generateIndicators(
    input: DetectionInput,
    bc: BodyComposition,
    rng: SeededRandom
  ): IndicatorValue[] {
    const indicators: IndicatorValue[] = [];

    // 定义指标模板
    const templates = [
      // 心血管系统
      { name: '心率', unit: 'bpm', refLow: 60, refHigh: 100, base: 72, variance: 15 },
      { name: '血压(收缩压)', unit: 'mmHg', refLow: 90, refHigh: 140, base: 120, variance: 15 },
      { name: '血压(舒张压)', unit: 'mmHg', refLow: 60, refHigh: 90, base: 78, variance: 10 },
      { name: '血氧饱和度', unit: '%', refLow: 95, refHigh: 100, base: 97, variance: 2 },
      // 代谢指标
      { name: '基础代谢率', unit: 'kcal', refLow: 1200, refHigh: 2200, base: bc.bmr, variance: 50 },
      { name: 'BMI', unit: 'kg/m²', refLow: 18.5, refHigh: 24, base: bc.bmi, variance: 0.5 },
      { name: '体脂率', unit: '%', refLow: input.gender === 'male' ? 14 : 17, refHigh: input.gender === 'male' ? 24 : 28, base: bc.bodyFatPercent, variance: 2 },
      // 体质指标
      { name: '水分含量', unit: 'L', refLow: 35, refHigh: 45, base: bc.water, variance: 1 },
      { name: '肌肉量', unit: 'kg', refLow: 40, refHigh: 60, base: bc.muscle, variance: 2 },
      { name: '骨量', unit: 'kg', refLow: 2.5, refHigh: 3.5, base: bc.mineral, variance: 0.2 },
      // 器官功能（模拟值）
      { name: '肝功能指数', unit: '分', refLow: 70, refHigh: 100, base: 85, variance: 10 },
      { name: '肾功能指数', unit: '分', refLow: 70, refHigh: 100, base: 85, variance: 10 },
      { name: '脾胃功能指数', unit: '分', refLow: 70, refHigh: 100, base: 80, variance: 12 },
      { name: '心肺功能指数', unit: '分', refLow: 70, refHigh: 100, base: 82, variance: 10 },
      // 营养指标
      { name: '蛋白质水平', unit: '%', refLow: 16, refHigh: 20, base: (bc.protein / bc.weight) * 100, variance: 1 },
      { name: '钙水平', unit: 'mg/dL', refLow: 8.5, refHigh: 10.5, base: 9.5, variance: 0.5 },
      { name: '铁水平', unit: 'mg/dL', refLow: 60, refHigh: 170, base: 100, variance: 20 },
      { name: '维生素D', unit: 'ng/mL', refLow: 30, refHigh: 100, base: 40, variance: 10 },
    ];

    for (const t of templates) {
      // 在基础值附近加扰动
      const value = Math.round((t.base + rng.range(-t.variance, t.variance)) * 10) / 10;

      // 计算状态
      let status = 0; // 正常
      if (value > t.refHigh) {
        status = value > t.refHigh * 1.2 ? 3 : 1; // 明显偏高 / 轻微偏高
      } else if (value < t.refLow) {
        status = value < t.refLow * 0.8 ? 4 : 2; // 明显偏低 / 轻微偏低
      }

      indicators.push({
        name: t.name,
        value,
        unit: t.unit,
        refLow: t.refLow,
        refHigh: t.refHigh,
        status,
      });
    }

    return indicators;
  }

  /**
   * 计算综合评分
   */
  private calculateScore(indicators: IndicatorValue[]): number {
    let total = 0;
    let count = 0;

    for (const ind of indicators) {
      let score: number;
      if (ind.status === 0) {
        score = 95;
      } else if (ind.status === 1 || ind.status === 2) {
        score = 75;
      } else {
        score = 55;
      }
      total += score;
      count++;
    }

    return count > 0 ? Math.round(total / count) : 70;
  }
}
