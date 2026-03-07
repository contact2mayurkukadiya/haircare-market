import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsEmail()
    email!: string;
}

export class ResetPasswordDto {
    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    otp!: string;

    @ApiProperty({ required: true, minLength: 8 })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    newPassword!: string;
}
