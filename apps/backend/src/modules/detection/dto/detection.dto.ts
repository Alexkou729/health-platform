import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class StartDetectionDto {
  @IsString() @IsNotEmpty({ message: '客户不能为空' }) customerId!: string;
  @IsString() @IsNotEmpty({ message: '设备不能为空' }) deviceId!: string;
  @IsOptional() @IsString() staffId?: string;
  @IsOptional() @IsString() storeId?: string;
  @IsOptional() @IsInt() @Min(30) @Max(120) duration?: number;
}

export class CompleteDetectionDto {
  @IsOptional() rawPayload?: any;
  @IsOptional() @IsNumber() @Min(0) @Max(100) overallScore?: number;
  @IsOptional() @IsString() constitution?: string;
  @IsOptional() @IsString() storeId?: string;
}
