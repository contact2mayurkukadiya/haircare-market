// prettier-ignore
import { IsString, IsNotEmpty, IsNumber, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  desc!: string;

  @ApiProperty({ required: true })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value.split(',').map((tag: string) => tag.trim());
      }
    }
    return value;
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false, type: 'array', items: { type: 'string', format: 'binary' } })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ required: true })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  stock!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;
}
