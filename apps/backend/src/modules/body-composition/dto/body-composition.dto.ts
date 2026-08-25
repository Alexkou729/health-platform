import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateBodyCompositionDto {
  @IsString() @IsNotEmpty() customerId!: string;
  @IsNumber() weightKg!: number;

  // === BMI ===
  @IsOptional() @IsNumber() bmi?: number;
  @IsOptional() @IsString() bmiType?: string;

  // === 体脂 ===
  @IsOptional() @IsNumber() bodyFatPercent?: number;
  @IsOptional() @IsNumber() bodyFatKg?: number;
  @IsOptional() @IsNumber() visceralFat?: number;

  // === 肌肉 ===
  @IsOptional() @IsNumber() muscleMassKg?: number;
  @IsOptional() @IsNumber() musclePercent?: number;

  // === 水分/无机盐/蛋白质/骨量 ===
  @IsOptional() @IsNumber() bodyWaterKg?: number;
  @IsOptional() @IsNumber() bodyWaterPercent?: number;
  @IsOptional() @IsNumber() proteinKg?: number;
  @IsOptional() @IsNumber() proteinPercent?: number;
  @IsOptional() @IsNumber() inorganicSaltKg?: number;
  @IsOptional() @IsNumber() inorganicSaltPercent?: number;
  @IsOptional() @IsNumber() boneMassKg?: number;

  // === 代谢 ===
  @IsOptional() @IsNumber() bmrKcal?: number;
  @IsOptional() @IsNumber() metabolicAge?: number;
  @IsOptional() @IsNumber() bodyScore?: number;
  @IsOptional() @IsNumber() recommendedIntakeKcal?: number;

  // === 8 段人体成分 (kg) ===
  @IsOptional() @IsNumber() headKg?: number;
  @IsOptional() @IsNumber() trunkKg?: number;
  @IsOptional() @IsNumber() leftArmKg?: number;
  @IsOptional() @IsNumber() rightArmKg?: number;
  @IsOptional() @IsNumber() leftLegKg?: number;
  @IsOptional() @IsNumber() rightLegKg?: number;

  // === 8 段脂肪 (kg) ===
  @IsOptional() @IsNumber() headFatKg?: number;
  @IsOptional() @IsNumber() trunkFatKg?: number;
  @IsOptional() @IsNumber() leftArmFatKg?: number;
  @IsOptional() @IsNumber() rightArmFatKg?: number;
  @IsOptional() @IsNumber() leftLegFatKg?: number;
  @IsOptional() @IsNumber() rightLegFatKg?: number;

  // === 8 段肌肉 (kg) ===
  @IsOptional() @IsNumber() headMuscleKg?: number;
  @IsOptional() @IsNumber() trunkMuscleKg?: number;
  @IsOptional() @IsNumber() leftArmMuscleKg?: number;
  @IsOptional() @IsNumber() rightArmMuscleKg?: number;
  @IsOptional() @IsNumber() leftLegMuscleKg?: number;
  @IsOptional() @IsNumber() rightLegMuscleKg?: number;

  // === 控制建议 (kg) ===
  @IsOptional() @IsNumber() weightControlKg?: number;
  @IsOptional() @IsNumber() muscleControlKg?: number;
  @IsOptional() @IsNumber() fatControlKg?: number;

  // === 来源 ===
  @IsOptional() @IsIn(['BLE_SCALE','MANUAL','IMPORTED','CLOUD_SYNC']) source?: string;
  @IsOptional() @IsString() deviceModel?: string;
  @IsOptional() @IsString() deviceMac?: string;
  @IsOptional() @IsString() rawPayload?: string;
  @IsOptional() measuredAt?: string | Date;
}

export class QueryBodyCompositionDto {
  @IsOptional() customerId?: string;
  @IsOptional() startDate?: string;
  @IsOptional() endDate?: string;
  @IsOptional() page?: number;
  @IsOptional() pageSize?: number;
}
