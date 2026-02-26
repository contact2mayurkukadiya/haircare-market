import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminSchema } from './entities/admin.schema';
import { AdminLocalStrategy } from './strategies/admin-local.strategy';
import { ProductsModule } from '../products/products.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'admins', schema: AdminSchema }]),
        ProductsModule,
    ],
    controllers: [AdminController],
    providers: [AdminService, AdminLocalStrategy],
})
export class AdminModule { }
