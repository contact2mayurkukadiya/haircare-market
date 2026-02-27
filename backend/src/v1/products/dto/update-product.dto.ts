// prettier-ignore
import { IsString, IsOptional, IsNumber, IsArray, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  desc?: string;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

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

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  stock?: number;

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

  // ── Image fields keep their own naming convention ──────────────────────────

  @ApiProperty({ required: false, type: 'array', items: { type: 'string', format: 'binary' } })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  new_images?: string[];

  /**
   * Filenames of existing images the client wants to KEEP.
   * Any existing image NOT in this list will be deleted from disk.
   */
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    // FormData sends repeated keys as array, but may arrive as a single string
    if (typeof value === 'string') return [value];
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  existing_images?: string[];
}
