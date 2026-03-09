import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PaymentGatewayConfigsService } from './payment-gateway-configs.service';
import { UpsertGatewayConfigDto } from './dto/upsert-gateway-config.dto';
import type { GatewayName } from './entities/payment-gateway-config.schema';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';

@ApiTags('Payment Gateways')
@Controller({ version: '1', path: 'admin/payment-gateways' })
export class PaymentGatewayAdminController {
    constructor(private readonly service: PaymentGatewayConfigsService) { }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'List all payment gateway configs (admin, credentials masked)' })
    @UseGuards(AdminAuthGuard)
    @Get()
    findAll() {
        console.log("findAll Payment Gateway")
        return this.service.findAll();
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Enable/disable a gateway and update its credentials' })
    @UseGuards(AdminAuthGuard)
    @Put(':gateway')
    upsert(
        @Param('gateway') gateway: GatewayName,
        @Body() dto: UpsertGatewayConfigDto,
    ) {
        return this.service.upsert(gateway, dto);
    }
}

/** Public controller for frontend — returns only gateway name + enabled flag, no credentials */
@ApiTags('Payment Gateways')
@Controller({ version: '1', path: 'payments/gateways' })
export class PaymentGatewayPublicController {
    constructor(private readonly service: PaymentGatewayConfigsService) { }

    @ApiOperation({ summary: 'Get enabled payment gateways (public, no credentials)' })
    @Get()
    findEnabled() {
        return this.service.findEnabled();
    }
}
