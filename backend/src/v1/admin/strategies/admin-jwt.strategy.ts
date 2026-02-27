import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtAdminPayload {
    sub: string;
    email: string;
    name: string;
    role: 'admin';
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwtSecret') || 'haircare_jwt_secret_key',
        });
    }

    async validate(payload: JwtAdminPayload): Promise<JwtAdminPayload> {
        // Ensure the token was issued for an admin
        if (payload.role !== 'admin') {
            return null as any;
        }
        return payload;
    }
}
