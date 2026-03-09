import {
    Controller,
    Post,
    Body,
    UseGuards,
    Request,
    Headers,
    type RawBodyRequest,
    Req,
    BadRequestException,
    Res,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request as ExpressRequest, Response } from 'express';

import { StripePaymentService } from './stripe.payment.service';
import { OrdersService } from '../orders/orders.service';
import { JwtUserPayload } from '../auth/strategies/jwt.strategy';

class CreateStripeIntentDto {
    orderId!: string;
    currency?: string;
}

@ApiTags('Payments')
@Controller({ version: '1', path: 'payments' })
export class PaymentsController {
    constructor(
        private readonly stripeService: StripePaymentService,
        private readonly ordersService: OrdersService,
        private readonly configService: ConfigService,
    ) { }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Create a Stripe PaymentIntent for an existing pending order' })
    @UseGuards(AuthGuard('jwt'))
    @Post('stripe/intent')
    async createStripeIntent(
        @Request() req: { user: JwtUserPayload },
        @Body() body: CreateStripeIntentDto,
    ) {
        const orders = await this.ordersService.findByUser(req.user.sub);
        const order = orders.find((o) => o._id?.toString() === body.orderId);
        if (!order) throw new BadRequestException('Order not found or does not belong to this user');
        if (order.status !== 'pending') throw new BadRequestException(`Order is already ${order.status}`);

        const amountCents = Math.round(order.total * 100); // Convert dollars → cents
        const currency = body.currency || 'usd';

        return this.stripeService.createPaymentIntent(amountCents, currency, body.orderId, req.user.sub);
    }

    @ApiOperation({ summary: 'Stripe webhook endpoint (raw body required)' })
    @Post('webhook/stripe')
    async stripeWebhook(
        @Req() req: RawBodyRequest<ExpressRequest>,
        @Headers('stripe-signature') signature: string,
        @Res() res: Response,
    ) {
        console.log("webhook called from stripe....")
        const rawBody = req.rawBody;
        if (!rawBody) throw new BadRequestException('Raw body required for webhook verification');
        await this.stripeService.handleWebhook(rawBody, signature);
        return res.status(HttpStatus.OK).send({ received: true });
    }
}
