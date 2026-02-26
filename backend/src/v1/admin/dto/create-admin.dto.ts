import { IsNotEmpty, IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
    @ApiProperty({ required: true })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({ required: true, minLength: 8 })
    @MinLength(8)
    @IsString()
    @IsNotEmpty()
    password!: string;

    @ApiProperty({ required: true })
    @IsString()
    @IsNotEmpty()
    name!: string;
}
