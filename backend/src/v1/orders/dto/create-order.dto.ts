import { IsString, IsNumber, IsArray, ValidateNested, IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PaymentMethodType } from '../entities/order.schema';

export class OrderItemDto {
    @ApiProperty() @IsString() productId!: string;
    @ApiProperty() @IsString() name!: string;
    @ApiProperty() @IsNumber() @Min(0) price!: number;
    @ApiProperty() @IsNumber() @Min(1) quantity!: number;
    @ApiPropertyOptional() @IsOptional() @IsString() image?: string;
}

export class ShippingAddressDto {
    @ApiPropertyOptional() @IsOptional() @IsString() street?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() zip?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
}

export class CreateOrderDto {
    @ApiProperty({ type: [OrderItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items!: OrderItemDto[];

    @ApiProperty({ type: ShippingAddressDto })
    @ValidateNested()
    @Type(() => ShippingAddressDto)
    shippingAddress!: ShippingAddressDto;

    @ApiProperty({ enum: ['stripe', 'paypal', 'upi', 'cod'] })
    @IsEnum(['stripe', 'paypal', 'upi', 'cod'])
    paymentMethod!: PaymentMethodType;

    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
