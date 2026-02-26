import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AdminService } from '../admin.service';
import { AdminDocument } from '../entities/admin.schema';

@Injectable()
export class AdminLocalStrategy extends PassportStrategy(Strategy, 'admin-local') {
    constructor(private readonly adminService: AdminService) {
        super({ usernameField: 'email' });
    }

    async validate(email: string, password: string): Promise<AdminDocument> {
        const admin = await this.adminService.validateAdmin(email, password);
        if (!admin) {
            throw new UnauthorizedException('Invalid admin credentials');
        }
        return admin;
    }
}
