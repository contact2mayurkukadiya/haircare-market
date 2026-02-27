import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    new_name?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    new_desc?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    new_isActive?: boolean;
}
