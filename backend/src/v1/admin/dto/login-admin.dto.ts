import { IsNotEmpty, IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginAdminDto {
    @ApiProperty({ required: true })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({ required: true, minLength: 8 })
    @MinLength(8)
    @IsString()
    @IsNotEmpty()
    password!: string;
}
