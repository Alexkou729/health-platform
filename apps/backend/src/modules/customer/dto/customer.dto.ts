import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsIn, IsNumber } from 'class-validator';

export class CreateCustomerDto {
  @IsString() @IsNotEmpty({ message: '姓名不能为空' }) name!: string;
  @IsString() @IsNotEmpty({ message: '手机号不能为空' }) phone!: string;
  @IsOptional() @IsInt() @Min(0) @Max(2) gender?: number;
  @IsOptional() @IsString() birthday?: string;
  @IsOptional() @IsInt() @Min(0) @Max(150) age?: number;
  @IsOptional() @IsInt() @Min(0) @Max(300) heightCm?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(500) weightKg?: number;
  @IsOptional() @IsString() storeId?: string;
  @IsOptional() @IsString() consultantId?: string;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @IsIn(['OFFLINE', 'WECHAT', 'REFERRAL', 'WECHAT_MINI']) source?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsInt() @Min(0) @Max(2) gender?: number;
  @IsOptional() @IsString() birthday?: string;
  @IsOptional() @IsInt() @Min(0) @Max(150) age?: number;
  @IsOptional() @IsInt() @Min(0) @Max(300) heightCm?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(500) weightKg?: number;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @IsIn(['BRONZE', 'SILVER', 'GOLD', 'DIAMOND']) level?: string;
  @IsOptional() @IsString() storeId?: string;
}
