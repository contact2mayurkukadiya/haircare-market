import { IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
    @ApiProperty({ required: true })
    @IsEmail()
    @IsNotEmpty()
    email!: string;
}
