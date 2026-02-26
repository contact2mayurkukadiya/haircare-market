import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
    @ApiProperty({ required: true })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({ required: true })
    @IsString()
    @IsNotEmpty()
    otp!: string;
}
