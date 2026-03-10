import { Module } from '@nestjs/common';

import { StripePaymentService } from './stripe.payment.service';
import { PaypalPaymentService } from './paypal.payment.service';
import { PaymentsController } from './payments.controller';
import { PaymentGatewayConfigsModule } from '../payment-gateway-configs/payment-gateway-configs.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [PaymentGatewayConfigsModule, OrdersModule],
    controllers: [PaymentsController],
    providers: [StripePaymentService, PaypalPaymentService],
})
export class PaymentsModule { }
