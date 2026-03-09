import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminSchema } from './entities/admin.schema';
import { AdminLocalStrategy } from './strategies/admin-local.strategy';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { ProductsModule } from '../products/products.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'admins', schema: AdminSchema }]),
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('jwtSecret') || 'haircare_jwt_secret_key',
                signOptions: { expiresIn: '7d' },
            }),
        }),
        ProductsModule,
    ],
    controllers: [AdminController],
    providers: [AdminService, AdminLocalStrategy, AdminJwtStrategy, AdminAuthGuard],
    exports: [AdminAuthGuard, AdminJwtStrategy, JwtModule],
})
export class AdminModule { }
