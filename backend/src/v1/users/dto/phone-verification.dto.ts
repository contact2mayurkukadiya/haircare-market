import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendPhoneOtpDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    phone!: string;
}

export class VerifyPhoneOtpDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    phone!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    otp!: string;
}

export class SavePhoneDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    phone!: string;
}
