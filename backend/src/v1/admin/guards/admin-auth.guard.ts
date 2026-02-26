import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const admin = request.session?.['adminId'];
        if (!admin) {
            throw new UnauthorizedException('Admin authentication required. Please login to the admin panel.');
        }
        return true;
    }
}
