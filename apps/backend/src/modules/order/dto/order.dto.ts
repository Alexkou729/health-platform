import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString() @IsNotEmpty() packageId!: string;
  @IsOptional() @IsInt() @Min(1) quantity?: number;
}

export class CreateOrderDto {
  @IsString() @IsNotEmpty() customerId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items!: OrderItemDto[];
  @IsOptional() @IsString() staffId?: string;
  @IsOptional() @IsString() storeId?: string;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @IsOptional() @IsString() couponCode?: string;
  @IsOptional() @IsString() remark?: string;
}

export class PayOrderDto {
  @IsString() @IsNotEmpty() paymentMethod!: string;
  @IsOptional() @IsString() paymentTradeNo?: string;
  @IsOptional() @IsString() storeId?: string;
}
