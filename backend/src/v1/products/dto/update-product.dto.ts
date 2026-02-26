// prettier-ignore
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
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
  @IsNumber()
  @IsOptional()
  new_price?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  new_category?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  new_tags?: string[];
}
