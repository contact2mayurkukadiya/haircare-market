import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
    @ApiProperty({ required: true })
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    desc?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isActive?: boolean;
}
