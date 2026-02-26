// prettier-ignore
import { IsString, IsNotEmpty, IsNumber, IsArray, IsOptional } from 'class-validator';
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
  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
