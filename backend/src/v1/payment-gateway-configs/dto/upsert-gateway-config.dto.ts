import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertGatewayConfigDto {
    @ApiProperty({ description: 'Whether this gateway is enabled', example: true })
    @IsBoolean()
    enabled!: boolean;

    @ApiPropertyOptional({
        description: 'Plaintext credentials (will be AES-256 encrypted before storage). Keys depend on gateway.',
        example: { secretKey: 'sk_test_...', publishableKey: 'pk_test_...' },
    })
    @IsOptional()
    @IsObject()
    credentials?: Record<string, string>;
}
