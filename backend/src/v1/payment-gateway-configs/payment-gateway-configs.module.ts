import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PaymentGatewayConfig, PaymentGatewayConfigSchema } from './entities/payment-gateway-config.schema';
import { PaymentGatewayConfigsService } from './payment-gateway-configs.service';
import { PaymentGatewayAdminController, PaymentGatewayPublicController } from './payment-gateway-configs.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PaymentGatewayConfig.name, schema: PaymentGatewayConfigSchema },
        ]),
        AdminModule,
    ],
    controllers: [PaymentGatewayAdminController, PaymentGatewayPublicController],
    providers: [PaymentGatewayConfigsService],
    exports: [PaymentGatewayConfigsService],
})
export class PaymentGatewayConfigsModule { }
