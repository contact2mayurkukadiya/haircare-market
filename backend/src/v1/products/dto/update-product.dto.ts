// prettier-ignore
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  new_name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  new_desc?: string;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  new_price?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  new_category?: string;

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
  new_tags?: string[];

  @ApiProperty({ required: false, type: 'array', items: { type: 'string', format: 'binary' } })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  new_images?: string[];
}
