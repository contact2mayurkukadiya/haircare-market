import { Controller, Post, Body, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginUserDto } from '../users/dto';
import type { IUserPreview } from 'src/interfaces';

@ApiTags('Auth')
@Controller({ version: '1', path: 'auth' })
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @ApiOperation({ summary: 'User login' })
    @ApiBody({ type: LoginUserDto })
    @ApiResponse({ status: 201, description: 'Returns JWT access token and user profile upon successful login.' })
    @Post('login')
    async login(@Body() body: LoginUserDto): Promise<{ access_token: string; user: IUserPreview }> {
        const user = await this.authService.validateUser(body.email, body.password);
        if (!user) throw new NotFoundException('User not found');
        if (!user.is_verified) {
            throw new ForbiddenException('Please verify your email before logging in');
        }
        const { access_token } = this.authService.signUserToken(user);
        return {
            access_token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                is_verified: user.is_verified,
            },
        };
    }
}
